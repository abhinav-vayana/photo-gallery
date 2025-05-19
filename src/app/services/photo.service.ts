import { Injectable } from '@angular/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { WebView } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  public photos: UserPhoto[] = [];
  private PHOTO_STORAGE: string = 'photos';
  constructor() {}
  private convertBlobToBase64 = (blob: Blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  private async readAsBase64(photo: Photo) {
    const response = await fetch(photo.webPath!);
    const blob = await response.blob();
    return (await this.convertBlobToBase64(blob)) as string;
  }
  private async savePicture(photo: Photo) {
    const base64Data = await this.readAsBase64(photo);
    const fileName = Date.now() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });
    return {
      filePath: fileName,
      webViewPath: photo.webPath!,
    };
  }
  public async addNewToGallery() {
    //Take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });
    const savedImageFile = await this.savePicture(capturedPhoto);
    console.log(savedImageFile.webViewPath);
    this.photos.unshift(savedImageFile);
    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });
  }
  public async loadSaved() {
    const photoList = await Preferences.get({ key: this.PHOTO_STORAGE });
    const photosInStorage = photoList ? JSON.parse(photoList.value!) : [];
    this.photos = photosInStorage as UserPhoto[];
    for (let photo of this.photos) {
      const readFile = await Filesystem.readFile({
        path: photo.filePath,
        directory: Directory.Data,
      });
      photo.webViewPath = `data:image/jpeg;base64,${readFile.data}`;
    }
  }
}
export interface UserPhoto {
  filePath: string;
  webViewPath: string;
}
