import { SITE } from '../types'

export const AFFILIATE_DISCLOSURE = `
**Last updated: ${new Date().getFullYear()}**

${SITE.name} is reader-supported. When you buy through links on our site, **we may earn an affiliate commission at no additional cost to you.**

## How it works

We are a participant in affiliate advertising programs, including but not limited to:

- **Amazon Associates Program** — as an Amazon Associate we earn from qualifying purchases.
- **Flipkart Affiliate Program**
- Other retailer and affiliate-aggregator programs relevant to the products we cover.

When you click a "Buy" or "View Deal" button and complete a purchase, the retailer may pay us a small percentage of the sale. **The price you pay is exactly the same** whether or not you use our links.

## Our promise

- Commissions **never** influence our rankings, ratings, or recommendations.
- We only recommend products we believe offer genuine value.
- Ratings reflect our honest assessment. We never publish fake reviews or fabricated ratings.
- Prices and availability shown are accurate as of the time of publishing and **may change** — always confirm the final price on the retailer's site before buying.

## Questions?

If you have any questions about our affiliate relationships, please [contact us](/contact).
`

export const PRIVACY_POLICY = `
**Last updated: ${new Date().getFullYear()}**

This Privacy Policy explains how ${SITE.name} ("we", "us") collects and uses information when you visit our website.

## Information we collect

- **Analytics data**: We use privacy-conscious analytics to understand aggregate traffic patterns (pages viewed, approximate location, device type). This data is anonymised where possible.
- **Affiliate click data**: When you click an outbound deal link, we log the click (the product, the source page, time, and general device info) so we can understand which content is helpful. We do **not** sell this data.
- **Newsletter email**: If you subscribe to our newsletter, we store your email address solely to send you deal updates. You can unsubscribe at any time.

## Cookies

We use cookies for analytics and to remember your preferences (such as cookie-consent choice). You can disable cookies in your browser at any time.

## Third parties

Outbound links take you to third-party retailers (Amazon, Flipkart, etc.) which have their own privacy policies. We are not responsible for the content or privacy practices of those sites.

## Your rights

You may request access to, correction of, or deletion of any personal data we hold about you by [contacting us](/contact).

## Changes

We may update this policy from time to time. Material changes will be reflected by the "last updated" date above.
`

export const TERMS = `
**Last updated: ${new Date().getFullYear()}**

By accessing ${SITE.name}, you agree to these Terms of Service.

## Use of the site

The content on this site is provided for general informational purposes only. While we strive for accuracy, we make no warranties about the completeness, reliability, or accuracy of any information, **including prices and product availability**, which are subject to change without notice.

## Affiliate links

This site contains affiliate links. See our [Affiliate Disclosure](/affiliate-disclosure) for details.

## No liability

Any reliance you place on information from this site is strictly at your own risk. We are not liable for any loss or damage arising from your use of the site or from purchases made through outbound links. Always verify product details, price, and warranty on the retailer's website before buying.

## Intellectual property

All trademarks, product names, and logos are the property of their respective owners. Product images may be sourced from retailers and remain the property of those parties.

## Changes

We may revise these terms at any time. Continued use of the site constitutes acceptance of the revised terms.
`

export const ABOUT = `
${SITE.name} exists to save you time and money. Every day, thousands of "deals" appear across Amazon, Flipkart and other retailers — but many are inflated discounts or simply not worth it.

## What we do

- **Hunt** across major Indian retailers for genuine price drops.
- **Verify** that a "discount" is real by checking price history and specs.
- **Review** products honestly — including the downsides — so you can decide with confidence.
- **Compare** competing products in clear "best of" roundups.

## How we stay honest

We earn affiliate commissions when you buy through our links, which keeps the site free. But commissions **never** change our rankings or verdicts. We rate products on merit, and we tell you when something *isn't* worth your money. Read our full [Affiliate Disclosure](/affiliate-disclosure).

## Get in touch

Spotted a deal we missed, or a price that's changed? [Let us know](/contact) — our readers help keep our data fresh.
`

export const CONTACT = `
We'd love to hear from you — whether it's a deal tip, a price correction, a product suggestion, or a partnership enquiry.

## Email

Reach us at **hello@${SITE.url.replace(/^https?:\/\//, '')}** and we'll get back to you as soon as we can.

## Tip a deal

Found an amazing deal we haven't covered? Send us the product link and we'll check it out and verify it for the community.

## Business & partnerships

For affiliate, advertising, or content partnership enquiries, use the same email with the subject line "Partnership".
`
