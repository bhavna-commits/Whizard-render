let selectedAmount = 500;
let selectedMessages = 5000;

let options = {
	key: "rzp_test_M49Qr1IfUjjfpq",
	amount: "50000",
	currency: currencyTag,
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

const stripeBtn = document.getElementById("btn");
const rightSide = document.getElementById("right-side");
const buttonText = stripeBtn.querySelector(".loader-text");
const loadingSpinner = stripeBtn.querySelector(".loading-spinner");
const btnWrap = document.getElementById("btn-wrap");
const stripeSection = document.getElementById("stripe-section");
const backBtn = document.getElementById("back-to-plans");
const planInputs = document.querySelectorAll('input[name="plan"]');
const planTitle = document.getElementById("payment-plan-title");
const paymentElementContainer = document.getElementById("card-element");
const stripeLoader = document.getElementById("stripe-loader");
const stripePaymentBox = document.getElementById("stripe-payment-box");
const cardWrapper = document.getElementById("card-wrapper");
const errorDiv = document.getElementById("card-errors");
const titleHead = document.getElementById("titleHead");

planInputs.forEach((input) => {
	input.addEventListener("change", () => {
		const planCard = input.nextElementSibling;
		const priceText = planCard.querySelector(".text-xl").textContent.trim();
		const messageText = planCard.querySelector("h3").textContent.trim();

		selectedAmount = priceText.replace(currencyTag, "");
		selectedMessages = Number(messageText.replace(" Messages", ""));

		planTitle.innerText = `You chose: ${selectedMessages} Messages – ${currencyTag} ${selectedAmount}`;
		titleHead.innerText = `${selectedMessages} Messages for ${currencyTag} ${selectedAmount}`;
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
