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

// Session logging message event listener
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
		}
	} catch {
		console.log("message event catch: ", event.data);
	}
});

// Response callback
const fbLoginCallback = (response) => {
	if (response.authResponse) {
		const code = response.authResponse.code;
		console.log("response: ", code);
		fetch("/api/facebook/auth_code", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				code,
			}),
		})
			.then((response) => response.json())
			.then((data) => {
				console.log("Access Token received:", data.access_token);
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	} else {
		console.log("response: ", response);
	}
};

// Launch method and callback registration
const launchWhatsAppSignup = () => {
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
