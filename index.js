const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');
const results = [];

const shopifyAPIEndpoint = 'https://{SHOPIFY_STORE_URL}}/admin/api/2023-04/';
const accessToken = process.env.SHOPIFY_ACCCESS_TOKEN;

// Function to create a price rule and return its ID
async function createPriceRule(discountDetails) {
  const url = `${shopifyAPIEndpoint}price_rules.json`;
  const headers = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": accessToken,
  };

  let value;
  if (discountDetails['Value Type'] === 'fixed_amount') {
    value = parseFloat(discountDetails.Value); // Ensure this is a negative value
    if (value > 0) value = -value; // Convert to negative if not already
  } else if (discountDetails['Value Type'] === 'percentage') {
    value = parseFloat(discountDetails.Value) / 100; // Convert to decimal and ensure negative
    if (value > 0) value = -value; // Convert to negative if not already
  }

  const priceRuleBody = {
    price_rule: {
      title: discountDetails.Name,
      target_type: 'line_item',
      target_selection: 'all',
      allocation_method: 'across',
      value_type: discountDetails['Value Type'],
      value: value,
      customer_selection: 'all', // Simplified to 'all' for the purpose of this example
      starts_at: new Date().toISOString(),
    }
  };

  try {
    const response = await axios.post(url, priceRuleBody, { headers });
    console.log('Price rule created:', response.data.price_rule.title);
    return response.data.price_rule.id;
  } catch (error) {
    console.error('Failed to create price rule:', error.response.data.errors);
    return null;
  }
}
  // Function to create a discount code under a specific price rule
  async function createDiscountCode(priceRuleId, codeName) {
    const url = `${shopifyAPIEndpoint}price_rules/${priceRuleId}/discount_codes.json`;
    const headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    };
  
    const discountCodeBody = {
      discount_code: {
        code: codeName,
      }
    };
  
    try {
      await axios.post(url, discountCodeBody, { headers });
      console.log(`Discount code created: ${codeName}`);
    } catch (error) {
      console.error(`Failed to create discount code: ${codeName}`, error.response ? error.response.data.errors : error.message);
    }
  }
  
  // Main function to process the CSV and create discounts
  function processDiscounts() {
    fs.createReadStream('discounts.csv')
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        console.log('CSV file successfully processed');
        
        for (let discount of results) {
          const priceRuleId = await createPriceRule(discount);
          if (priceRuleId) {
            await createDiscountCode(priceRuleId, discount.Name);
          } else {
            console.log(`Failed to create price rule for discount: ${discount.Name}`);
          }
        }
      });
  }
  
  // Replace 'your-shop.myshopify.com' and 'Your Shopify Admin API Access Token' with your actual Shopify shop URL and access token.
  processDiscounts();