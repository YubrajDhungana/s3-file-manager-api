module.exports = {
  accounts: [
    {
      id: "account-1",
      name: "Production Account",
      accessKey: "AXIt...",
      region: "us-east-1",
    },
    {
      id: "account-2",
      name: "Development Account",
      accessKey: "AXIT...",
      region: "us-west-2",
    },
    {
      id: "account-3",
      name: "Staging Account",
      accessKey: "AXIT...",
      region: "eu-west-1",
    },
  ],
  buckets: [
    {
      id: "bucket-1",
      name: "production-files",
      accountId: "account-1",
      region: "us-east-1",
    },
    {
      id: "bucket-2",
      name: "dev-uploads",
      accountId: "account-2",
      region: "us-west-2",
    },
    {
      id: "bucket-3",
      name: "staging-data",
      accountId: "account-3",
      region: "eu-west-1",
    },
  ],
};
