// 相簿的照片清單。由 tools/prep_gallery.py 產生，不要手改：
//   1. 照片放進 assets/raw/gallery/<資料夾>/（一場活動一個資料夾）
//   2. 資料夾裡放一個 album.json：{"title": "瑤池金母聖誕", "date": "農曆七月十八", "order": 1}
//   3. 跑 python -I tools/prep_gallery.py
// 每本相簿：{ title, date, photos: [{ src, thumb, w, h, alt }] }
export const ALBUMS = [];
