# Unit 16 — thiết kế hoàn tất

Cập nhật: 2026-09-16. Chủ đề: **설날에는 밥 대신 떡국을 먹어요**.

## Kết quả

- **139/139 hình đã duyệt và tích hợp**: 133 hình từ vựng, năm kết quả tung 윷 và một cảnh bác sĩ thú y khám mèo.
- Giữ phong cách pixel art ấm áp của các Unit hiện có; PNG nền trong suốt, cao 192 px, alpha nhị phân và bảng màu 64 màu.
- Sổ từ vựng hiển thị hình riêng cho đủ 133 từ, kèm nghĩa tiếng Việt.
- Giáo trình có bảng 11 hình hoạt động/món ăn ngày lễ, năm kết quả tung gậy và ba lựa chọn bằng hình cho bài nghe về mèo.
- Workbook và quiz dùng hình đúng ngữ cảnh; giữ nội dung, đáp án và âm thanh đã có.
- Unit 16 đã đăng ký trong chọn bài, bàn học, cassette, dịch tiếng Việt và trình quản trị.

## Nội dung gốc được sử dụng

Unit 16 đã có trên nhánh `content/remaining-units`; phần nội dung này được đưa vào bản làm việc artwork trước khi thiết kế. Không tạo lại bài học.

| Thành phần | Số lượng |
| --- | ---: |
| Từ vựng | 133 |
| Bài workbook | 15 |
| Bài giáo trình | 14 |
| Câu quiz | 13 |
| Track cassette | 10 |
| Tệp âm thanh | 95 |
| Bộ dữ liệu dịch tiếng Việt | 5 |

Quiz giữ chuỗi đáp án `CBACBDABCDBAD`. Các hình 윷 thể hiện đúng bốn gậy và số mặt phẳng lần lượt 1, 2, 3, 4, 0 cho 도, 개, 걸, 윷, 모.

## Hồ sơ hình ảnh

- Công cụ: **built-in Imagegen**, tạo hình mới từ mô tả cảnh.
- [Bộ prompt cuối cùng — 139 hình](unit16-art-prompts.json).
- [Mô tả 133 cảnh từ vựng](unit16-scene-briefs.txt).
- Hình nguồn: `docs/unit-art-sources/unit16_*.png`.
- Bản xuất đã duyệt: `docs/unit-art-candidates/unit16_*.png`.
- Hình chạy trong game: `sprites/items/unit16_*.png`, `sprites/foods/unit16_*.png`, `sprites/quiz/unit16_*.png`.
- [Manifest và dấu kiểm duyệt](unit-art-redesign.json): các mục 696–834, gồm hash nguồn, bản xuất và ảnh ghép để rà soát.
- [Ghi chú nội dung trước khi thiết kế](unit16-art-notes.md) được giữ làm lịch sử yêu cầu.

## Kiểm tra

- Kiểm tra cú pháp JavaScript đạt.
- Content validation: 9161/9161 điều kiện đạt.
- Bộ `npm test` đạt, gồm kiểm tra riêng Unit 16: 133 hình, 139 mục đã duyệt, audio, đáp án và vòng lưu/đọc qua admin.
- Admin: 131/131 kiểm tra đạt.
- `verify:facts` đạt.
- Manifest artwork: 835/835 hình của toàn bộ các Unit được xác nhận hoàn chỉnh.
- Đã xem trực tiếp sổ từ vựng Unit 16 bằng tiếng Việt trong trình duyệt và rà hình nguồn/bản xuất qua các bảng ảnh.

## Cập nhật về sau

Sau khi sửa hình và duyệt lại manifest, chạy `node scripts/link_unit16_art.js` để cập nhật liên kết bài tập. Script giữ đáp án và cập nhật đồng thời ghi chú tiếng Anh cùng khóa dịch tiếng Việt.

Kiểm tra giao diện bổ sung: bảng năm kết quả tung gậy hiển thị đúng trên desktop; ba lựa chọn minh hoạ bài nghe xếp dọc và đọc rõ ở chiều rộng 390 px. Năm bộ dữ liệu Unit 16 đạt 100% bản dịch tiếng Việt trong báo cáo i18n.

