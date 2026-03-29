import { randomUUID } from "node:crypto";
import {
	createPhoto,
	deletePhoto,
	findPhotoById,
	findPhotosByUser,
} from "../infrastructure/photo.repository";
import { deleteFromR2, uploadToR2 } from "../infrastructure/photo.storage";
import { getPublicUrl } from "../infrastructure/r2.server";
import {
	ALLOWED_CONTENT_TYPES,
	MAX_FILE_SIZE,
	uploadFileSchema,
} from "./upload.schema";

export async function uploadPhoto(
	userId: string,
	file: File,
): Promise<{ file_url: string; image_id: string }> {
	// Validate
	uploadFileSchema.parse({
		contentType: file.type,
		size: file.size,
		filename: file.name,
	});

	const ext = file.name.split(".").pop() ?? "jpg";
	const key = `photos/${userId}/${randomUUID()}.${ext}`;

	const buffer = Buffer.from(await file.arrayBuffer());

	if (process.env.R2_ACCOUNT_ID !== "placeholder_account_id") {
		await uploadToR2(key, buffer, file.type);
	} else {
		console.warn("⚠️ Mocking R2 Upload. Please fill out R2 Config in .env");
	}

	const record = await createPhoto({
		userId,
		key,
		filename: file.name,
		contentType: file.type,
		size: file.size,
	});

	return {
		file_url: getPublicUrl(key),
		image_id: record.id,
	};
}

export async function getUserPhotos(userId: string, page = 1, limit = 10) {
	const { photos, total } = await findPhotosByUser(userId, page, limit);
	return {
		data: photos.map((p) => ({
			id: p.id,
			url: getPublicUrl(p.key),
			filename: p.filename,
			status: p.status,
			created_at: p.createdAt.toISOString(),
		})),
		total_pages: Math.ceil(total / limit),
	};
}

export async function removePhoto(userId: string, imageId: string) {
	const photo = await findPhotoById(imageId);
	if (!photo || photo.userId !== userId) {
		throw new Error("Photo not found");
	}
	await deleteFromR2(photo.key);
	await deletePhoto(photo.id);
}

export async function confirmUpload(
	userId: string,
	data: { key: string; filename: string; contentType: string; size: number },
): Promise<{ file_url: string; image_id: string }> {
	const record = await createPhoto({
		userId,
		key: data.key,
		filename: data.filename,
		contentType: data.contentType,
		size: data.size,
	});

	return {
		file_url: getPublicUrl(data.key),
		image_id: record.id,
	};
}

export { ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE };
