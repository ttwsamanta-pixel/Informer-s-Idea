// Reserved interface for a future content provider. File processors never use it.
export interface ContentProvider {
  getSiteNotice(): Promise<string | null>;
}
export const localContentProvider: ContentProvider = {
  async getSiteNotice() {
    return null;
  },
};
