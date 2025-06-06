// SDK initialization
window.fbAsyncInit = function () {
	FB.init({
		appId: app_id,
		autoLogAppEvents: true,
		xfbml: true,
		version: graph_v,
	});
};

(function (d, s, id) {
	var js,
		fjs = d.getElementsByTagName(s)[0];
	if (d.getElementById(id)) return;
	js = d.createElement(s);
	js.id = id;
	js.src = "https://connect.facebook.net/en_US/sdk.js";
	fjs.parentNode.insertBefore(js, fjs);
})(document, "script", "facebook-jssdk");

let waba_id = null;
let phone_number_id = null;
let fbAccessToken = null;

// Function to send data when all variables are available
function showLoader() {
	const loader = document.getElementById("afterSignUpLoader");
	if (loader) {
		loader.classList.remove("hidden");
	}
}

function hideLoader() {
	const loader = document.getElementById("afterSignUpLoader");
	if (loader) {
		loader.classList.add("hidden");
	}
}

function sendDataToBackend() {
	if (waba_id && phone_number_id && fbAccessToken) {
		showLoader();

		fetch("/api/facebook/auth_code", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				access_token: fbAccessToken,
				waba_id,
				phone_number_id,
			}),
		})
			.then((response) => response.json())
			.then((data) => {
				hideLoader();
				if (data.success) {
					openSet2FAPin(phone_number_id);
				} else {
					toast("error", data.error);
				}
			})
			.catch((error) => {
				hideLoader();
				console.error("Error saving data:", error);
				toast("error",error);
			});
	}
}


// Message event listener
window.addEventListener("message", (event) => {
	if (
		event.origin !== "https://www.facebook.com" &&
		event.origin !== "https://web.facebook.com"
	)
		return;
	try {
		const data = JSON.parse(event.data);
		if (data.type === "WA_EMBEDDED_SIGNUP") {
			console.log("message event: ", data);
			waba_id = data.data.waba_id;
			phone_number_id = data.data.phone_number_id;
			// sendDataToBackend();
		}
	} catch (error) {
		console.log("message event catch: ", event.data);
	}
});

// Login callback
const fbLoginCallback = (response) => {
	if (response.authResponse) {
		fbAccessToken = response.authResponse.code; // Assign to global variable
		console.log("Access Token received:", fbAccessToken);
		sendDataToBackend(); // Check if we can send after receiving token
	}
};

// Launch method
const launchWhatsAppSignup = () => {
	// console.log(config_id);
	FB.login(fbLoginCallback, {
		config_id: config_id,
		response_type: "code",
		override_default_response_type: true,
		extras: {
			setup: {},
			featureType: "",
			sessionInfoVersion: "3",
		},
	});
};
