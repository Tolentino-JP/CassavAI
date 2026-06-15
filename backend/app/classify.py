from torchvision.models import (
    densenet121, resnet50, convnext_small, swin_t, vit_b_16,
    efficientnet_v2_s, mobilenet_v3_large
)
from torchvision import transforms
import torch
from PIL import Image
from pathlib import Path


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

weights_dir = Path(__file__).parent.parent.parent / "model" / "weights"

models_config = {
    "ResNet50": {
        "model": resnet50,
        "weights": weights_dir / "ResNet50.pth"
    },
    "ConvNeXt": {
        "model": convnext_small,
        "weights": weights_dir / "ConvNeXt-S.pth"
    },
    "SwinT": {
        "model": swin_t,
        "weights": weights_dir / "Swin-T.pth"
    },
    "EfficientNetV2": {
        "model": efficientnet_v2_s,
        "weights": weights_dir / "EfficientNet-v2.pth"
    },
    "Vit-B": {
        "model": vit_b_16,
        "weights": weights_dir / "Vit-B.pth"
    },
    "MobileNetV3": {
        "model": mobilenet_v3_large,
        "weights": weights_dir / "MobileNet-v3.pth"
    },
    "DenseNet121": {
        "model": densenet121,
        "weights": weights_dir / "DenseNet121.pth"
    }
}

loaded_models = {}
class_names = None

for name, cfg in models_config.items():
    
    if not cfg["weights"].exists():
        raise FileNotFoundError(
            f"[{name}] Weight file not found: {cfg['weights']}"
        )

    
    checkpoint = torch.load(str(cfg["weights"]), map_location=device, weights_only=False)

    # Extract class_names from first available checkpoint (same for all models)
    if class_names is None and "class_names" in checkpoint:
        class_names = checkpoint["class_names"]

    
    if "model_state_dict" in checkpoint:
        state_key = "model_state_dict"
    elif "model_state" in checkpoint:
        state_key = "model_state"
    else:
        raise KeyError(
            f"[{name}] Checkpoint must contain 'model_state_dict' or 'model_state'. "
            f"Found keys: {list(checkpoint.keys())}"
        )

    
    if class_names is not None:
        num_classes = len(class_names)
    else:
        
        state_dict = checkpoint[state_key]
        output_keys = [
            "fc.weight",               
            "classifier.2.weight",     
            "head.weight",             
            "heads.head.weight",       
            "classifier.1.weight",     
            "classifier.3.weight",     
            "classifier.weight",       
        ]
        num_classes = None
        for key in output_keys:
            if key in state_dict:
                num_classes = state_dict[key].shape[0]
                break
        if num_classes is None:
            raise ValueError(
                f"[{name}] Could not infer num_classes from checkpoint. "
                f"No known output layer key found."
            )

    model = cfg["model"](weights=None)

    # Adjust classifier head to match num_classes
    if name == "ResNet50":
        model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
    elif name == "ConvNeXt":
        model.classifier[2] = torch.nn.Linear(model.classifier[2].in_features, num_classes)
    elif name == "SwinT":
        model.head = torch.nn.Linear(model.head.in_features, num_classes)
    elif name == "Vit-B":
        model.heads.head = torch.nn.Linear(model.heads.head.in_features, num_classes)
    elif name == "EfficientNetV2":
        model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, num_classes)
    elif name == "MobileNetV3":
        model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, num_classes)
    elif name == "DenseNet121":
        model.classifier = torch.nn.Linear(model.classifier.in_features, num_classes)

    # Load weights
    model.load_state_dict(checkpoint[state_key], strict=True)
    model.to(device)
    model.eval()

    loaded_models[name] = model
    print(f"[✓] Loaded {name} — {num_classes} classes")


if class_names is None:
    raise ValueError(
        "No 'class_names' key found in any checkpoint. "
        "Ensure your .pth files include class_names when saved."
    )

# print(f"\n[✓] Classes ({len(class_names)}): {class_names}\n")


# Standard ImageNet normalization
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


def predict_best_ensemble(image: Image.Image, return_individual: bool = True) -> dict:

    results = {
        "weighted": predict_ensemble_weighted(image, return_individual),
        "hard_voting": predict_ensemble_hard_voting(image, return_individual),
        "soft_voting": predict_ensemble_soft_voting(image, return_individual),  # your 3rd function
    }

    # Find the technique with the highest confidence
    best_technique = max(results, key=lambda k: results[k]["confidence"])
    best_result = results[best_technique]

    response = {
        **best_result
    }

    print(response)

    return response





@torch.no_grad()
def predict_ensemble_soft_voting(image: Image.Image, return_individual: bool = True) -> dict:
    
    image_tensor = transform(image).unsqueeze(0).to(device)

    probs_sum = None
    individual_results = {}

    for name, model in loaded_models.items():
        outputs = model(image_tensor)
        probs = torch.softmax(outputs, dim=1)

        probs_sum = probs if probs_sum is None else probs_sum + probs

        if return_individual:
            conf, pred = torch.max(probs, dim=1)
            individual_results[name] = {
                "class_id": pred.item(),
                "class_name": class_names[pred.item()],
                "confidence": round(conf.item(), 4)
            }

    avg_probs = probs_sum / len(loaded_models)
    ensemble_conf, ensemble_pred = torch.max(avg_probs, dim=1)

    response = {
        "class_id": ensemble_pred.item(),
        "class_name": class_names[ensemble_pred.item()],
        "confidence": round(ensemble_conf.item(), 4),
        "probabilities": [round(float(p), 6) for p in avg_probs.squeeze(0).tolist()]
    }

    if return_individual:
        response["individual_models"] = individual_results

    return response



# Weighted Soft Voting Ensemble


# Validation accuracies per model
val_accuracies = {
    "ResNet50":       0.9750,
    "ConvNeXt":       0.9750,
    "SwinT":          0.9583,
    "Vit-B":          0.9625,
    "EfficientNetV2": 0.8750,
    "MobileNetV3":    0.9375,
    "DenseNet121":    0.9750
}


total_acc = sum(val_accuracies.values())
weights = {
    name: acc / total_acc
    for name, acc in val_accuracies.items()
}


@torch.no_grad()
def predict_ensemble_weighted(image: Image.Image, return_individual: bool = True) -> dict:
    
    image_tensor = transform(image).unsqueeze(0).to(device)

    weighted_probs_sum = None
    individual_results = {}

    for name, model in loaded_models.items():
        outputs = model(image_tensor)
        probs = torch.softmax(outputs, dim=1)

        weight = weights[name]
        weighted_probs = probs * weight

        weighted_probs_sum = (
            weighted_probs
            if weighted_probs_sum is None
            else weighted_probs_sum + weighted_probs
        )

        if return_individual:
            conf, pred = torch.max(probs, dim=1)
            individual_results[name] = {
                "class_id": pred.item(),
                "class_name": class_names[pred.item()],
                "confidence": round(conf.item(), 4),
                "weight": round(weight, 4)
            }

    conf, pred = torch.max(weighted_probs_sum, dim=1)

    response = {
        "class_id": pred.item(),
        "class_name": class_names[pred.item()],
        "confidence": round(conf.item(), 4),
        "probabilities": [
            round(float(p), 6)
            for p in weighted_probs_sum.squeeze(0).tolist()
        ]
    }

    if return_individual:
        response["individual_models"] = individual_results



    return response



@torch.no_grad()
def predict_ensemble_hard_voting(image: Image.Image, return_individual: bool = True) -> dict:

    image_tensor = transform(image).unsqueeze(0).to(device)

    votes = {}
    individual_results = {}

    for name, model in loaded_models.items():
        outputs = model(image_tensor)
        probs = torch.softmax(outputs, dim=1)

        conf, pred = torch.max(probs, dim=1)
        pred_id = pred.item()

        votes[pred_id] = votes.get(pred_id, 0) + 1

        if return_individual:
            individual_results[name] = {
                "class_id": pred_id,
                "class_name": class_names[pred_id],
                "confidence": round(conf.item(), 4),
                "weight": round(1 / len(loaded_models), 4)
            }

    ensemble_pred = max(votes, key=lambda k: (votes[k], k))
    total_models = len(loaded_models)


    probabilities = [
        round(votes.get(i, 0) / total_models, 6)
        for i in range(len(class_names))
    ]

    response = {
        "class_id": ensemble_pred,
        "class_name": class_names[ensemble_pred],
        "confidence": round(votes[ensemble_pred] / total_models, 4),
        "probabilities": probabilities
    }

    if return_individual:
        response["individual_models"] = individual_results

    return response