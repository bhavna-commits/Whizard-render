let selectedAmount = 499;
let selectedMessages = 5000;

let options = {
	key,
	amount: "49900",
	currency: currencyTag || "INR",
	name: "Whizard",
	description: `${selectedMessages} Messages`,
	image: `${url}/whizardLogo.png`,
	order_id: "order_IluGWxBm9U8zJ8",
	handler: async function (response) {
		try {
			const res = await fetch(`${url}/settings/confirm-payment`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					razorpay_payment_id: response.razorpay_payment_id,
					razorpay_order_id: response.razorpay_order_id,
					razorpay_signature: response.razorpay_signature,
				}),
			});

			const data = await res.json();

			if (data?.redirectUrl) {
				window.location.href = data.redirectUrl;
			} else {
				// fallback
				window.location.href = `${url}/settings/payments`;
			}
		} catch (err) {
			console.error("Payment verification failed", err);
			window.location.href = `${url}/settings/payments`;
		}
	},
	theme: {
		color: "black",
	},
	prefill: {
		name,
		email,
		contact,
	},
};

document.addEventListener("DOMContentLoaded", () => {
	const stripeBtn = document.getElementById("btn");
	const rightSide = document.getElementById("right-side");
	const buttonText = stripeBtn.querySelector(".loader-text");
	const loadingSpinner = stripeBtn.querySelector(".loading-spinner");
	const btnWrap = document.getElementById("btn-wrap");
	const stripeSection = document.getElementById("stripe-section");
	const backBtn = document.getElementById("back-to-plans");
	const planInputs = document.querySelectorAll('input[name="plan"]');
	const errorDiv = document.getElementById("card-errors");

	planInputs.forEach((input) => {
		input.addEventListener("change", () => {
			const planCard = input.nextElementSibling;

			// Extract number of messages
			const messageText = planCard.querySelector("h3").textContent.trim();
			const messagesMatch = messageText.match(/([\d,]+)\s*messages/i);
			selectedMessages = messagesMatch
				? Number(messagesMatch[1].replace(/,/g, ""))
				: 0;
		});
	});	

	stripeBtn?.addEventListener("click", async () => {
		loadingSpinner.classList.remove("hidden");
		buttonText.classList.add("hidden");
		stripeBtn.disabled = true;

		try {
			await initializeOrUpdateIntent(selectedMessages);
		} catch (err) {
			console.error(err?.message || err);
			toast(
				"error",
				"Payment setup failed: " + (err?.message || err || "Try again"),
			);
		} finally {
			loadingSpinner.classList.add("hidden");
			buttonText.classList.remove("hidden");
			stripeBtn.disabled = false;
		}
	});

	backBtn?.addEventListener("click", () => {
		stripeSection.classList.add("hidden");
		rightSide.classList.remove("hidden");
		btnWrap.classList.remove("hidden");
	});

	async function initializeOrUpdateIntent(messages) {
		errorDiv.textContent = "";

		const res = await fetch("/api/settings/create-payment-intent", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ messages }),
		});

		const { intentId, success, message } = await res.json();

		options.order_id = intentId;

		if (!success) throw message;

		var rzp1 = new Razorpay(options);
		rzp1.open();
	}
});

// function showMessage(msg) {
// 	let el = document.getElementById("payment-message");
// 	if (!el) {
// 		el = document.createElement("div");
// 		el.id = "payment-message";
// 		el.className = "text-sm text-red-600 mt-4 text-center";
// 		stripeSection.appendChild(el);
// 	}
// 	el.textContent = msg;
// 	el.classList.remove("hidden");
// 	setTimeout(() => el.classList.add("hidden"), 4000);
// }

// function setLoading(isLoading) {
// 	const btn = document.getElementById("submit");
// 	if (!btn) return;
// 	btn.disabled = isLoading;
// 	document.getElementById("spinner").classList.toggle("hidden", !isLoading);
// 	document
// 		.getElementById("button-text")
// 		.classList.toggle("hidden", isLoading);
// }
