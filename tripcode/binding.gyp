{
	"targets": [{
		"target_name": "tripcode",
		"include_dirs" : [
			"<!@(node -p \"require('node-addon-api').include\")"
		],
		"sources": ["tripcode.cc"],
		"defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
		"link_settings": {
			"conditions": [
				["OS==\"linux\"", {"libraries": ["-lcrypt"]}],
				["OS==\"freebsd\"", {"libraries": ["-lcrypt"]}],
				["OS==\"mac\"", {"libraries": ["-lcrypto", "/usr/lib/libiconv.dylib"]}]
			]
		}
	}]
}
