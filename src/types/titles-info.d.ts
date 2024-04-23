type TitleInfo = {
    titleId?: string;
    xboxTitleId?: string;
    hasTouchSupport?: boolean;
    imageHero?: string;
};

type ApiTitleInfo = {
    titleId: string;
    details: {
        xboxTitleId: string;
        productId: string;
        supportedInputTypes: string[];
    };
};

type ApiCatalogInfo = {
    StoreId: string;
    Image_Hero: {
        URL: string;
    };
    Image_Tile: {
        URL: string;
    };
};
