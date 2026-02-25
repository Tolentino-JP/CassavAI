from torchvision.models import (
    densenet121, resnet50, convnext_small, swin_t, vit_b_16,
    efficientnet_v2_s, mobilenet_v3_large
)
from torchvision import transforms
import torch
from PIL import Image
from pathlib import Path
from .model_loader import model_paths


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Get the weights directory path relative to this file
# weights_dir = Path(__file__).parent.parent.parent / "model" / "weights"

models_config = {
    "ResNet50": {
        "model": resnet50,
        "weights": model_paths["ResNet50.pth"]
    },
    "ConvNeXt": {
        "model": convnext_small,
        "weights": model_paths["ConvNeXt-S.pth"] 
    },
    "SwinT": {
        "model": swin_t,
        "weights": model_paths["Swin-T.pth"]
    },
    "EfficientNetV2": {
        "model": efficientnet_v2_s,
        "weights": model_paths["EfficientNet-v2.pth"]
    },
    "Vit-B": {
        "model": vit_b_16,
        "weights": model_paths["Vit-B.pth"]
    },
    "MobileNetV3": {
        "model": mobilenet_v3_large,
        "weights": model_paths["MobileNet-v3.pth"]
    },
    "DenseNet121": {
        "model": densenet121,
        "weights": model_paths["DenseNet121.pth"]
    }
}

loaded_models = {}
class_names = None

for name, cfg in models_config.items():
    checkpoint = torch.load(str(cfg["weights"]), map_location=device)
    
    # Extract class_names from first checkpoint (same for all)
    if class_names is None and "class_names" in checkpoint:
        class_names = checkpoint["class_names"]
    
    # Create model
    model = cfg["model"](weights=None)
    num_classes = len(class_names) if class_names else checkpoint["model_state"].get("classifier.1.weight", torch.tensor([0])).shape[0]
    
    # Adjust classifier head
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
    
    # Load state dict
    state_key = "model_state_dict" if "model_state_dict" in checkpoint else "model_state"
    model.load_state_dict(checkpoint[state_key], strict=True)
    model.to(device)
    model.eval()
    
    loaded_models[name] = model


transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

@torch.no_grad()
def predict_ensemble_soft_voting(image: Image.Image, return_individual: bool = True):
    """
    Soft Voting Ensemble:
    - each model gives probability vector
    - ensemble = average of probabilities
    """
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

# _____________________________________________________


# Validation accuracies you provided
val_accuracies = {
    "ResNet50": 0.9750,
    "ConvNeXt": 0.9750,
    "SwinT": 0.9583,
    "Vit-B": 0.9625,
    "EfficientNetV2": 0.8750,
    "MobileNetV3": 0.9375,
    "DenseNet121": 0.9750
}

# Normalize weights so they sum to 1
total_acc = sum(val_accuracies.values())
weights = {
    name: acc / total_acc
    for name, acc in val_accuracies.items()
}

@torch.no_grad()
def predict_ensemble_weighted(image: Image.Image, return_individual: bool = True):
    """
    Weighted Soft Voting Ensemble:
    - each model gives probability vector
    - ensemble = weighted average of probabilities
    """

    image_tensor = transform(image).unsqueeze(0).to(device)

    weighted_probs_sum = None
    individual_results = {}

    for name, model in loaded_models.items():
        outputs = model(image_tensor)
        probs = torch.softmax(outputs, dim=1)

        weight = weights[name]  # Get normalized weight
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

    ensemble_conf, ensemble_pred = torch.max(weighted_probs_sum, dim=1)

    response = {
        "class_id": ensemble_pred.item(),
        "class_name": class_names[ensemble_pred.item()],
        "confidence": round(ensemble_conf.item(), 4),
        "probabilities": [
            round(float(p), 6)
            for p in weighted_probs_sum.squeeze(0).tolist()
        ]
    }

    if return_individual:
        response["individual_models"] = individual_results

    return response