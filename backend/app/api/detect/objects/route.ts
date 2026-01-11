import { NextRequest, NextResponse } from "next/server";

// Python detection microservice URL
const PYTHON_SERVICE_URL = process.env.PYTHON_DETECTION_URL || "http://localhost:8000";

/**
 * POST /api/detect/objects
 *
 * Proxies detection requests to the Python OpenCV/YOLO microservice.
 * The Python service provides:
 * - YOLO object detection (80 COCO classes)
 * - OpenCV color analysis in HSV space
 * - Colorblind-aware problematic color detection
 *
 * Request body:
 * {
 *   "image": "base64-encoded-image-data",
 *   "colorblindness_type": "deuteranopia" | "protanopia" | etc.,
 *   "min_confidence": 0.5 (optional)
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();

    if (!body.image) {
      return NextResponse.json(
        { error: "Missing required field: image" },
        { status: 400 }
      );
    }

    console.log(`[Detection] Forwarding to Python service: ${PYTHON_SERVICE_URL}/detect`);
    console.log(`[Detection] Colorblindness type: ${body.colorblindness_type || 'normal'}`);

    // Forward request to Python detection service
    const response = await fetch(`${PYTHON_SERVICE_URL}/detect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: body.image,
        colorblindness_type: body.colorblindness_type || "normal",
        min_confidence: body.min_confidence || 0.15,  // Very low threshold for maximum recall
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Detection] Python service error:", errorText);
      return NextResponse.json(
        { error: "Detection service error", details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    const processingTime = Date.now() - startTime;
    
    console.log(`[Detection] Python service returned ${result.objects?.length || 0} objects in ${processingTime}ms`);

    return NextResponse.json({
      ...result,
      backend_processing_time_ms: processingTime,
    });

  } catch (error) {
    console.error("[Detection] Error:", error);
    
    // Check if it's a connection error
    if (error instanceof Error && 
        (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed"))) {
      return NextResponse.json(
        { 
          error: "Python detection service unavailable",
          message: "Start the Python service: cd python-detection && python main.py",
          details: "The Python OpenCV detection microservice is not running"
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process detection request", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Check Python service health
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/health`, {
      method: "GET",
    });
    const health = await response.json();
    
    return NextResponse.json({
      endpoint: "/api/detect/objects",
      method: "POST",
      description: "Object detection with OpenCV color analysis for colorblind users",
      python_service: {
        url: PYTHON_SERVICE_URL,
        ...health
      }
    });
  } catch (error) {
    return NextResponse.json({
      endpoint: "/api/detect/objects",
      method: "POST",
      description: "Object detection with OpenCV color analysis for colorblind users",
      python_service: {
        url: PYTHON_SERVICE_URL,
        status: "unavailable",
        message: "Start with: cd python-detection && python main.py"
      }
    });
  }
}
