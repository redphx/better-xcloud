import { NATIVE_FETCH } from "./bx-flags"

export class XboxApi {
    private static CACHED_TITLES: Record<string, string> = {};

    static async getProductTitle(xboxTitleId: number | string): Promise<string | null> {
        xboxTitleId = xboxTitleId.toString();
        if (XboxApi.CACHED_TITLES[xboxTitleId]) {
            return XboxApi.CACHED_TITLES[xboxTitleId];
        }

        try {
            const url = `https://displaycatalog.mp.microsoft.com/v7.0/products/lookup?market=US&languages=en&value=${xboxTitleId}&alternateId=XboxTitleId&fieldsTemplate=browse`;
            const resp = await NATIVE_FETCH(url);
            const json = await resp.json();

            const productTitle = json['Products'][0]['LocalizedProperties'][0]['ProductTitle'];
            XboxApi.CACHED_TITLES[xboxTitleId] = productTitle;

            return productTitle;
        } catch (e) {}

        return null;
    }
}
