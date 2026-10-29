export interface Photo {
  id: number;
  /** file:// URI of the app's own copy of the photo. */
  uri: string;
  width: number;
  height: number;
}
