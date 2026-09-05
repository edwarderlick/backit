#!/usr/bin/env node
/**
 * Prints the three canonical fixture claims. Actual prove() must run on-chain
 * against live pages; this script does not write a frontend verdict.
 */
const fixtures = [
  {
    outcome: "TRUE",
    claim: "This domain is for use in illustrative examples in documents.",
    url: "https://example.com/",
  },
  {
    outcome: "FALSE",
    claim: "Example Domain is the official website of the United Nations.",
    url: "https://example.com/",
  },
  {
    outcome: "THIN",
    claim: "Bitcoin whitepaper was released in 2008.",
    url: "https://bitcoin.org/bitcoin.pdf",
  },
];

console.log("BackIt smoke fixtures (StudioNet test GEN):");
for (const f of fixtures) {
  console.log(`- expect ${f.outcome}: "${f.claim}" @ ${f.url}`);
}
console.log("Use the app /back then /claim/[id] prove. IDs come from the contract hash.");
