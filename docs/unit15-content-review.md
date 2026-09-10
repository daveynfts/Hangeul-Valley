# Rà soát Unit 15 — 10/09/2026

Dự án đã cập nhật 48 commit từ remote đến `06deeb3`. Các thay đổi cục bộ có sẵn trong workflow và bài test R2 được khôi phục sau khi cập nhật.

## Khối lượng và mức độ đầy đủ

| Thành phần | Kết quả |
| --- | --- |
| Từ vựng và biểu thức | 104 mục, chia thành 7 nhóm; đủ câu mẫu tiếng Hàn, nghĩa tiếng Anh và bản dịch tiếng Việt |
| Sách giáo khoa | 11 phần, 44 câu, thêm 11 ví dụ mẫu có đáp án |
| Sách bài tập | 13 bài, 63 câu, 13 ví dụ mẫu |
| Quiz bàn học | 13 câu, mỗi lượt chọn 10 câu |
| Cassette | 10 track gốc, giữ nguyên dữ liệu âm thanh |

Tổng cộng 120 câu luyện tập/quiz và 24 ví dụ mẫu. Khối lượng hiện tại đủ cho phạm vi bốn mẫu chính: A-아/어지다, V-게 되다, V-기 전에, V-(으)ㄴ 후에. Không cần tăng thêm câu trắc nghiệm chỉ để tăng số lượng. Nên học theo từng nhóm, sau đó làm phần tổng hợp.

Sau khi cập nhật remote, 43/104 mục vẫn thiếu câu mẫu và nghĩa câu mẫu; phần còn lại có một số câu lệch nghĩa. Bộ câu mẫu hiện tại được biên soạn bổ sung để thống nhất độ dài và tập trung vào chủ đề cuộc sống, thay đổi, trình tự trước/sau. Đây không phải bản chép nguyên văn sách.

## Các lỗi đã sửa

- `낳다` từng gắn câu về ăn mì; `수도` mang nghĩa thủ đô nhưng ví dụ nói tiền nước. Đã thay bằng ví dụ đúng nghĩa.
- Bổ sung ví dụ cho mọi mục, kể cả các nhãn ngữ pháp; bỏ câu mẫu còn chỗ trống.
- Bổ sung ví dụ giải sẵn trước mỗi phần sách giáo khoa.
- Sửa câu mẫu `라면을 넣기 전에 먼저 물을 끓여요.` về đúng trật tự.
- Giải thích rõ ㄹ rụng trước ㄴ trong `만들다 → 만든 후에`, và mệnh đề với 후에 vẫn dùng được trong câu nói tương lai.
- Chỉnh giải thích `-게 되다` để không đồng nhất mọi trường hợp với kết quả ngoài ý muốn.
- Bỏ các lựa chọn gây nhập nhằng ở câu cước điện thoại và `알다`; không coi các cách dùng hợp lệ là sai tuyệt đối.
- Thêm tóm tắt đọc hiểu hiển thị ngay trong câu hỏi. Chuyển chỗ điền đáp án khỏi cụm `맞지 않는` sang dòng trả lời riêng.
- Làm rõ số liệu Seoul là số liệu so sánh lịch sử của bài học, không phải số liệu hiện tại; sửa phần giải thích số cầu tăng.
- Sửa bộ nhận diện ví dụ với `낳다/넣다` và các dạng chia cần cho Unit 15. Lỗi này cũng làm lộ hai ví dụ sai của `넣다` ở Unit 11 và TOPIK; đã sửa hai mục đó cùng bản dịch.

Việc diễn giải `-게 되다` tham khảo [nghiên cứu về chức năng nghĩa và giảng dạy cấu trúc này](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001917856). Cách dùng động từ chỉ lượng được đối chiếu với [ví dụ từ điển của Viện Quốc ngữ Hàn Quốc](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=62482&nation=eng).

## Phạm vi còn cần phân biệt

Sách bài tập có hai bài nói mở chưa đưa vào phần chấm tự động: `V-게 되다 연습 3` và `V-(으)ㄴ 후에 연습 2`. Ghi chú trong dữ liệu đã nêu rõ 13/15 bài được chuyển thành bài chấm điểm. Không coi số lượng hiện tại là toàn bộ mọi hoạt động trong sách.

Nội dung đọc hiểu bổ sung là tóm tắt học tập dựa trên dữ liệu hiện có, không phải toàn văn sách. Đợt rà soát này không đối chiếu trực tiếp từng trang bản in hoặc nghe lại toàn bộ track gốc.

## Kiểm tra

- `npm run check`: 31 tệp JavaScript hợp lệ.
- `npm run validate`: 8.455/8.455 điều kiện đạt; 7.349/7.349 chuỗi cần dịch đã có bản dịch.
- `npm test`: toàn bộ chuỗi test chạy hoàn tất, gồm test mới `test_unit15_content.js`.
- Test mới kiểm tra ví dụ đủ ba ngôn ngữ, chỗ điền đáp án, ngữ cảnh đọc hiểu và lỗi nhận diện `낳다/넣다`.
- `git diff --check`: không có lỗi khoảng trắng.

Các thay đổi đang nằm trong workspace, chưa commit hoặc xuất bản.
