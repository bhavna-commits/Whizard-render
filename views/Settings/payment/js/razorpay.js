let selectedAmount = 499;
let selectedMessages = 5000;
let selectedPlan = 3;
let description = "Growth";

let options = {
	key,
	amount: "49900",
	currency: currencyTag || "INR",
	name: "Whizard",
	description,
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
	/** Plan */ {
		const planInputs = document.querySelectorAll("input[name='plan']");
		const planPaymentBtn = document.getElementById("plan-payment-btn");
		const planButtonText = planPaymentBtn.querySelector(".loader-text");
		const planLoadingSpinner =
			planPaymentBtn.querySelector(".loading-spinner");

		planInputs.forEach((input) => {
			input.addEventListener("change", () => {
				const planCard = input.nextElementSibling;
				selectedPlan = Number(
					planCard.querySelector("input").value.trim(),
				);
				description = planCard.querySelector("h3").textContent.trim();
			});
		});

		planPaymentBtn?.addEventListener("click", async () => {
			planLoadingSpinner.classList.remove("hidden");
			planButtonText.classList.add("hidden");
			planPaymentBtn.disabled = true;

			try {
				await initializeOrUpdateIntent(selectedPlan, "plan");
			} catch (err) {
				console.error(err?.message || err);
				toast(
					"error",
					"Payment setup failed: " +
						(err?.message || err || "Try again"),
				);
			} finally {
				planLoadingSpinner.classList.add("hidden");
				planButtonText.classList.remove("hidden");
				planPaymentBtn.disabled = false;
			}
		});
	}

	/** Messages */ {
		const planInputs = document.querySelectorAll("input[name='credits']");
		const stripeBtn = document.getElementById("btn");
		const buttonText = stripeBtn.querySelector(".loader-text");
		const loadingSpinner = stripeBtn.querySelector(".loading-spinner");

		planInputs.forEach((input) => {
			input.addEventListener("change", () => {
				const planCard = input.nextElementSibling;
				selectedMessages = Number(
					planCard.querySelector("input").value.trim(),
				);
				description = planCard.querySelector("h3").textContent.trim();
			});
		});

		stripeBtn?.addEventListener("click", async () => {
			loadingSpinner.classList.remove("hidden");
			buttonText.classList.add("hidden");
			stripeBtn.disabled = true;

			try {
				await initializeOrUpdateIntent(selectedMessages, "credits");
			} catch (err) {
				console.error(err?.message || err);
				toast(
					"error",
					"Payment setup failed: " +
						(err?.message || err || "Try again"),
				);
			} finally {
				loadingSpinner.classList.add("hidden");
				buttonText.classList.remove("hidden");
				stripeBtn.disabled = false;
			}
		});
	}

	async function initializeOrUpdateIntent(messages, type) {
		const res = await fetch("/api/settings/create-payment-intent", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ messages, type }),
		});

		const { intentId, success, message } = await res.json();

		options.order_id = intentId;
		options.description = description;

		if (!success) throw message;

		var rzp1 = new Razorpay(options);
		rzp1.open();
	}
});
