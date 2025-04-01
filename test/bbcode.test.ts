import { describe, test, expect } from "vitest";
import { convert } from "../src/bbcode.js";

describe("BBCode", () => {
    test("Converts markdown to BBCode", async () => {
        const markdown = `# Test

This is a test.

## Subheading

This is a subheading.

### Subsubheading

This is a subsubheading.

#### Subsubsubheading

This is a subsubsubheading.

##### Subsubsubsubheading

This is a subsubsubsubheading.

###### Subsubsubsubsubheading

This is a subsubsubsubsubheading.

- This is a list item.
- This is another list item.
- This is a third list item.
`;

        const bbcode = await convert(markdown);

        expect(bbcode).toMatchSnapshot();
    });

});
