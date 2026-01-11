"""
YOLO-based Object Detector using OpenCV DNN
"""

import os
import logging
import urllib.request
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# COCO class names (80 classes)
COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake",
    "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop",
    "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

# Objects relevant for driving/colorblind assistance
# These get priority, but we now detect ALL COCO objects for comprehensive view
RELEVANT_OBJECTS = {
    "traffic light": {"priority": "critical", "color_relevant": True},
    "stop sign": {"priority": "critical", "color_relevant": True},
    "car": {"priority": "high", "color_relevant": True},  # For brake lights
    "truck": {"priority": "high", "color_relevant": True},
    "bus": {"priority": "high", "color_relevant": True},
    "motorcycle": {"priority": "high", "color_relevant": True},
    "bicycle": {"priority": "medium", "color_relevant": False},
    "person": {"priority": "medium", "color_relevant": False},
    "fire hydrant": {"priority": "low", "color_relevant": True},
    # Additional objects for general detection
    "dog": {"priority": "medium", "color_relevant": False},
    "cat": {"priority": "low", "color_relevant": False},
    "bird": {"priority": "low", "color_relevant": False},
    "bench": {"priority": "low", "color_relevant": False},
    "umbrella": {"priority": "low", "color_relevant": True},
    "backpack": {"priority": "low", "color_relevant": False},
    "handbag": {"priority": "low", "color_relevant": False},
    "suitcase": {"priority": "low", "color_relevant": False},
    "bottle": {"priority": "low", "color_relevant": False},
    "chair": {"priority": "low", "color_relevant": False},
    "couch": {"priority": "low", "color_relevant": False},
    "potted plant": {"priority": "low", "color_relevant": True},  # Green
    "tv": {"priority": "low", "color_relevant": False},
    "laptop": {"priority": "low", "color_relevant": False},
    "cell phone": {"priority": "low", "color_relevant": False},
    "boat": {"priority": "low", "color_relevant": False},
    "train": {"priority": "medium", "color_relevant": True},
    "airplane": {"priority": "low", "color_relevant": False},
}


class ObjectDetector:
    """YOLO-based object detector using OpenCV DNN"""
    
    def __init__(self, model_dir: str = "models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        self.net: Optional[cv2.dnn.Net] = None
        self.output_layers: list = []
        self.classes = COCO_CLASSES
        
        self._load_model()
    
    def _download_file(self, url: str, filepath: Path) -> bool:
        """Download file from URL"""
        try:
            logger.info(f"Downloading {filepath.name}...")
            urllib.request.urlretrieve(url, str(filepath))
            logger.info(f"Downloaded {filepath.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to download {filepath.name}: {e}")
            return False
    
    def _ensure_model_files(self) -> tuple[Path, Path]:
        """Ensure YOLO model files exist, download if needed"""
        weights_path = self.model_dir / "yolov3-tiny.weights"
        config_path = self.model_dir / "yolov3-tiny.cfg"
        
        # URLs for YOLOv3-tiny (smaller, faster model)
        weights_url = "https://pjreddie.com/media/files/yolov3-tiny.weights"
        config_url = "https://raw.githubusercontent.com/pjreddie/darknet/master/cfg/yolov3-tiny.cfg"
        
        # Download if not exists
        if not weights_path.exists():
            self._download_file(weights_url, weights_path)
        
        if not config_path.exists():
            self._download_file(config_url, config_path)
        
        return weights_path, config_path
    
    def _load_model(self):
        """Load YOLO model"""
        try:
            weights_path, config_path = self._ensure_model_files()
            
            if not weights_path.exists() or not config_path.exists():
                logger.error("Model files not available")
                return
            
            # Load network
            self.net = cv2.dnn.readNet(str(weights_path), str(config_path))
            
            # Use CPU (change to CUDA if GPU available)
            self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
            self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            
            # Get output layer names
            layer_names = self.net.getLayerNames()
            self.output_layers = [layer_names[i - 1] for i in self.net.getUnconnectedOutLayers()]
            
            logger.info("YOLO model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.net = None
    
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.net is not None
    
    def detect(self, frame: np.ndarray, confidence_threshold: float = 0.10) -> list[dict]:
        """
        Detect objects in frame
        
        Args:
            frame: BGR image as numpy array
            confidence_threshold: Minimum confidence for detection (default 0.10 for maximum recall)
            
        Returns:
            List of detected objects with bbox, label, and confidence
        """
        if not self.is_loaded():
            logger.warning("Model not loaded, cannot detect")
            return []
        
        height, width = frame.shape[:2]
        logger.info(f"Frame size: {width}x{height}")
        
        # Create blob from image
        blob = cv2.dnn.blobFromImage(
            frame, 
            scalefactor=1/255.0,
            size=(416, 416),
            swapRB=True,
            crop=False
        )
        
        # Run forward pass
        self.net.setInput(blob)
        outputs = self.net.forward(self.output_layers)
        
        # Process detections
        boxes = []
        confidences = []
        class_ids = []
        
        for output in outputs:
            for detection in output:
                scores = detection[5:]
                class_id = np.argmax(scores)
                confidence = scores[class_id]
                
                if confidence > confidence_threshold:
                    # Scale bounding box to original image size
                    center_x = int(detection[0] * width)
                    center_y = int(detection[1] * height)
                    w = int(detection[2] * width)
                    h = int(detection[3] * height)
                    
                    # Calculate top-left corner
                    x = int(center_x - w / 2)
                    y = int(center_y - h / 2)
                    
                    boxes.append([x, y, w, h])
                    confidences.append(float(confidence))
                    class_ids.append(class_id)
        
        # Apply Non-Maximum Suppression
        if len(boxes) == 0:
            return []
            
        indices = cv2.dnn.NMSBoxes(boxes, confidences, confidence_threshold, 0.4)
        
        # Handle empty indices
        if indices is None or len(indices) == 0:
            return []
        
        detections = []
        # NMSBoxes returns different formats depending on OpenCV version
        # Flatten to handle both cases
        if isinstance(indices, np.ndarray):
            indices = indices.flatten()
        
        for i in indices:
            idx = int(i)
            label = self.classes[class_ids[idx]]
            
            x, y, w, h = boxes[idx]
            
            # Ensure bbox is within frame bounds
            x = max(0, x)
            y = max(0, y)
            w = min(w, width - x)
            h = min(h, height - y)
            
            # Get priority and color relevance from RELEVANT_OBJECTS if defined
            obj_info = RELEVANT_OBJECTS.get(label, {"priority": "low", "color_relevant": False})
            
            detections.append({
                "label": label,
                "confidence": confidences[idx],
                "bbox": (x, y, w, h),
                "priority": obj_info["priority"],
                "color_relevant": obj_info["color_relevant"]
            })
        
        # Sort by priority (critical first)
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        detections.sort(key=lambda x: priority_order.get(x["priority"], 4))
        
        return detections

    def detect_color_regions(self, frame: np.ndarray, min_area: int = 2000) -> list[dict]:
        """
        Detect significant color regions in the frame as fallback when YOLO finds nothing.
        This ensures we always have something to show bounding boxes on.
        
        Args:
            frame: BGR image
            min_area: Minimum area for a region to be considered
            
        Returns:
            List of detected color regions with bounding boxes
        """
        height, width = frame.shape[:2]
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # Color ranges to detect
        color_ranges = {
            "red": [((0, 70, 50), (10, 255, 255)), ((170, 70, 50), (180, 255, 255))],
            "orange": [((10, 100, 100), (25, 255, 255))],
            "yellow": [((25, 100, 100), (35, 255, 255))],
            "green": [((35, 70, 50), (85, 255, 255))],
            "blue": [((85, 70, 50), (130, 255, 255))],
            "purple": [((130, 70, 50), (160, 255, 255))],
            "pink": [((160, 70, 50), (170, 255, 255))],
        }
        
        detections = []
        
        for color_name, ranges in color_ranges.items():
            # Combine masks for colors with multiple ranges (like red)
            mask = None
            for lower, upper in ranges:
                lower = np.array(lower, dtype=np.uint8)
                upper = np.array(upper, dtype=np.uint8)
                color_mask = cv2.inRange(hsv, lower, upper)
                mask = color_mask if mask is None else cv2.bitwise_or(mask, color_mask)
            
            # Find contours
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > min_area:
                    x, y, w, h = cv2.boundingRect(contour)
                    
                    # Skip if too small or too large (probably background)
                    if w < 30 or h < 30:
                        continue
                    if w > width * 0.8 or h > height * 0.8:
                        continue
                    
                    confidence = min(area / 50000, 0.9)  # Larger area = higher confidence
                    
                    detections.append({
                        "label": f"{color_name} object",
                        "confidence": confidence,
                        "bbox": (x, y, w, h),
                        "priority": "low",
                        "color_relevant": True,
                        "detected_color": color_name
                    })
        
        # Sort by area (largest first) and take top 5
        detections.sort(key=lambda x: x["bbox"][2] * x["bbox"][3], reverse=True)
        return detections[:5]
