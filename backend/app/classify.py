from torchvision.models import (
    resnet50, convnext_small, swin_t, vit_b_16,
    efficientnet_v2_s, mobilenet_v3_large, alexnet
)
from torchvision import transforms
import torch
from PIL import Image
from .class_names import CLASS_NAMES


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


num_classes = len(CLASS_NAMES)

models = {
    "ResNet50": {
        "model": resnet50,
        "weights": "weights/resnet50.pth"
    },
    "ConvNeXt": {
        "model": convnext_small,
        "weights": "weights/convnext.pth"
    },
    "SwinT": {
        "model": swin_t,
        "weights": "weights/swint.pth"
    },
    "ViT": {
        "model": vit_b_16,
        "weights": "weights/vit.pth"
    },
    "EfficientNetV2": {
        "model": efficientnet_v2_s,
        "weights": "weights/efficientnetv2.pth"
    },
    "MobileNetV3": {
        "model": mobilenet_v3_large,
        "weights": "weights/mobilenetv3.pth"
    },
    "AlexNet": {
        "model": alexnet,
        "weights": "weights/alexnet.pth"
    }
}

loaded_models = {}

for name, cfg in models.items():
    model = cfg["model"](weights=None)

    # Replace classifier head to match num_classes
    if name == "ResNet50":
        model.fc = torch.nn.Linear(model.fc.in_features, num_classes)

    elif name == "ConvNeXt":
        model.classifier[2] = torch.nn.Linear(model.classifier[2].in_features, num_classes)

    elif name == "SwinT":
        model.head = torch.nn.Linear(model.head.in_features, num_classes)

    elif name == "ViT":
        model.heads.head = torch.nn.Linear(model.heads.head.in_features, num_classes)

    elif name == "EfficientNetV2":
        model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, num_classes)

    elif name == "MobileNetV3":
        model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, num_classes)

    elif name == "AlexNet":
        model.classifier[6] = torch.nn.Linear(model.classifier[6].in_features, num_classes)

    state = torch.load(cfg["weights"], map_location=device)

    # handle case where state dict is nested
    if isinstance(state, dict) and "model_state_dict" in state:
        state = state["model_state_dict"]

    model.load_state_dict(state, strict=True)
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

        # sum probs for ensemble
        probs_sum = probs if probs_sum is None else probs_sum + probs

        # store individual model results 
        if return_individual:
            conf, pred = torch.max(probs, dim=1)
            individual_results[name] = {
                "class_id": pred.item(),
                "class_name": CLASS_NAMES[pred.item()],
                "confidence": round(conf.item(), 4)
            }

    avg_probs = probs_sum / len(loaded_models)
    ensemble_conf, ensemble_pred = torch.max(avg_probs, dim=1)

    response = {
        "ensemble": {
            "class_id": ensemble_pred.item(),
            "class_name": CLASS_NAMES[ensemble_pred.item()],
            "confidence": round(ensemble_conf.item(), 4),
            # optional: full probability distribution (useful for frontend charts)
            "probabilities": [round(float(p), 6) for p in avg_probs.squeeze(0).tolist()]
        }
    }

    if return_individual:
        response["individual_models"] = individual_results

    return response
