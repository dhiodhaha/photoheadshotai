export interface GalleryItem {
	id: string;
	src: string;
	thumbnail?: string;
	style: string;
	styleLabel: string;
	createdAt: string;
	isFavorited: boolean;
	isPending?: boolean;
}

export interface TrashItem {
	id: string;
	src: string;
	thumbnail?: string;
	style: string;
	styleLabel: string;
	createdAt: string;
}
