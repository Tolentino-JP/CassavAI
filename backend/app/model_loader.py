from huggingface_hub import hf_hub_download

MODEL_FILES = [
    "ResNet50.pth",
    "ConvNeXt-S.pth",
    "Swin-T.pth",
    "EfficientNet-v2.pth",
    "Vit-B.pth",
    "MobileNet-v3.pth",
    "DenseNet121.pth",
    "Yolov8.pt"
]

model_paths = {}

for file in MODEL_FILES:
    model_paths[file] = hf_hub_download(
        repo_id="your-username/your-repo",
        filename=file
    )