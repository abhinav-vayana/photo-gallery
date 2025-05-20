import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { Capacitor, WebView } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { ArrayType } from '@angular/compiler';
@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  public photos: UserPhoto[] = [];
  private PHOTO_STORAGE: string = 'photos';
  private platform: Platform;
  constructor(platform: Platform) {
    this.platform = platform;
  }
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
    if (this.platform.is('hybrid')) {
      const file = await Filesystem.readFile({
        path: photo.path!,
      });
      return file.data;
    } else {
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();
      return (await this.convertBlobToBase64(blob)) as string;
    }
  }
  private async savePicture(photo: Photo) {
    const base64Data = await this.readAsBase64(photo);
    const fileName = Date.now() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });
    if (this.platform.is('hybrid')) {
      return {
        filePath: savedFile.uri,
        webViewPath: Capacitor.convertFileSrc(savedFile.uri),
      };
    } else {
      return {
        filePath: fileName,
        webViewPath: photo.webPath!,
      };
    }
  }
  public async addNewToGallery() {
    //Take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });
    const savedImageFile = await this.savePicture(capturedPhoto);
    if (!Array.isArray(this.photos)) {
      this.photos = [];
    }
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
    if (!this.platform.is('hybrid')) {
      // Display the photo by reading into base64 format
      for (let photo of this.photos) {
        // Read each saved photo's data from the Filesystem
        const readFile = await Filesystem.readFile({
          path: photo.filePath,
          directory: Directory.Data,
        });

        // Web platform only: Load the photo as base64 data
        photo.webViewPath = `data:image/jpeg;base64,${readFile.data}`;
      }
    }
  }
}
export interface UserPhoto {
  filePath: string;
  webViewPath: string;
}
