import mongoose, { Schema } from "mongoose";

const CampaignReportSchema = new mongoose.Schema(
	{
		WABA_ID: { type: String, required: true },
		FB_PHONE_ID: { type: String, required: true },
		useradmin: { type: String, required: true },
		unique_id: { type: String, required: true },
		campaignId: {
			type: String,
			ref: "Campaign",
			required: true,
		},
		contactName: { type: String, required: true },
		recipientPhone: { type: String, required: true },
		status: {
			type: String,
			enum: ["SENT", "DELIVERED", "READ", "FAILED", "REPLIED"],
			required: true,
		},
		failed: {
			code: String,
			text: String,
		},
		createdAt: {
			type: Number,
			default: () => Date.now(),
		},
		updatedAt: {
			type: Number,
			default: () => Date.now(),
		},
		deleted: { type: Boolean, default: false },
		messageId: { type: String, required: true },
		messageTemplate: { type: Schema.Types.Mixed },
		replyContent: { type: String, default: "" },
	},
	{
		timestamps: false,
		strict: false,
	},
);

+(
	// Single field indexes
	(+CampaignReportSchema.index({ useradmin: 1 }))
);
+CampaignReportSchema.index({ campaignId: 1 });
+CampaignReportSchema.index({ status: 1 });
+CampaignReportSchema.index({ recipientPhone: 1 });
+CampaignReportSchema.index({ createdAt: 1 }); // For time-based queries
+(+(
	// Unique index for messageId to prevent duplicates
	(+CampaignReportSchema.index({ messageId: 1 }, { unique: true }))
));
+(+(
	// Compound indexes
	(+CampaignReportSchema.index({ useradmin: 1, campaignId: 1 }))
)); // Common filter combination
+CampaignReportSchema.index({ status: 1, createdAt: 1 }); // Time-sorted status queries
+(+(
	// Optional index for deleted flag if using soft-delete frequently
	(+(
		// CampaignReportSchema.index({ deleted: 1 });

		CampaignReportSchema.pre("save", function (next) {
			if (this.isNew) {
				this.updatedAt = () => Date.now();
			}
			next();
		})
	))
));

export default mongoose.model("CampaignReport", CampaignReportSchema);
