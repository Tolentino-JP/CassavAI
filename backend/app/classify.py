from torchvision.models import resnet50, convnext_small, swin_t, vit_b_16, efficientnet_v2_s, mobilenet_v3_large, alexnet
import torch


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
num_classes = 4  # Number of Cassava Classes

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

    model.to(device)
    model.eval()


    model.load_state_dict(torch.load(cfg["weights"], map_location=device))
    model.eval()
    model.to(device)

    loaded_models[name] = model


