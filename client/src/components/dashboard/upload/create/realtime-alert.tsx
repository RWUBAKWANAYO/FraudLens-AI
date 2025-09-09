import React from "react";

export const RealTimeAlerts = () => {
  const alerts = [
    {
      id: "TX1014",
      title: "Duplicate transaction",
      description: "Transaction ID TX1014 matches 11 previous records. Cluster value: USD 200.00.",
    },
    {
      id: "TX2021",
      title: "High-value anomaly",
      description:
        "Transaction ID TX2021 flagged for exceeding normal limits. Amount: USD 15,000.00.",
    },
    {
      id: "TX3098",
      title: "Suspicious location",
      description:
        "Transaction ID TX3098 originated from Lagos, Nigeria. Previous activity location: Paris, France.",
    },
    {
      id: "TX4102",
      title: "Velocity alert",
      description:
        "Transaction ID TX4102 is the 5th attempt within 2 minutes. Total attempted value: USD 1,200.00.",
    },
    {
      id: "TX5187",
      title: "Blacklisted account",
      description:
        "Transaction ID TX5187 involves a sender flagged in watchlist. Amount: USD 750.00.",
    },
    {
      id: "TX6244",
      title: "Multiple card usage",
      description:
        "Transaction ID TX6244 uses card linked to 3 different user accounts within 24 hours.",
    },
    {
      id: "TX7350",
      title: "Geographic mismatch",
      description:
        "Transaction ID TX7350 attempted in London while user’s device shows New York activity.",
    },
    {
      id: "TX8422",
      title: "Unusual merchant",
      description: "Transaction ID TX8422 processed at unregistered merchant. Amount: USD 420.00.",
    },
  ];

  return (
    <div
      className="grid grid-cols-1 xl:grid-cols-2 gap-3"
      style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}
    >
      {alerts.map((alert, i) => (
        <div
          key={i}
          className="p-4 space-y-2 border border-accent-foreground border-s-[6px] border-s-colored-primary  rounded-[4px] shadow"
        >
          <h2 className="text-base font-bold text-primary">{alert.title}</h2>
          <p className="text-sm text-primary-foreground">{alert.description}</p>
        </div>
      ))}
    </div>
  );
};
