export type PhotoStatus =
	| "pending"
	| "uploaded"
	| "processing"
	| "completed"
	| "failed";

export interface Photo {
	id: string;
	userId: string;
	key: string;
	filename: string;
	contentType: string;
	size: number;
	status: PhotoStatus;
	createdAt: Date;
}
