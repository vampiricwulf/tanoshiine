{
    "targets": [
        {
            "target_name": "compare",
            "include_dirs" : [
                "<!@(node -p \"require('node-addon-api').include\")"
            ],
            "sources": [ "compare.cpp"],
            "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
        },
        {
            "target_name": "findapng",
            "include_dirs" : [
                "<!@(node -p \"require('node-addon-api').include\")"
            ],
            "sources": [ "findapng.cpp","apngDetector.cpp"],
            "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
        }
    ]
}
