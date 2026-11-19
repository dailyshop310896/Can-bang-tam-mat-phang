# TODO — Cân Bằng — Tâm & Mặt Phẳng

## 1. Đo lấy tâm bằng thước thủy tròn
- [x] Ứng dụng cân bằng lấy cảm hứng từ Livo, dùng để lấy tâm và lấy mặt phẳng.
- [x] Chế độ lấy tâm dạng thước thủy tròn, hiển thị bong bóng dịch chuyển theo độ nghiêng của thiết bị.

## 2. Đo và đọc mặt phẳng hai trục
- [x] Chế độ lấy mặt phẳng hai trục, thể hiện độ nghiêng ngang và dọc theo thời gian thực.
- [x] Hiển thị góc nghiêng bằng số theo đơn vị độ cho từng trục.

## 3. Hiệu chuẩn và thiết lập độ chính xác
- [x] Có nút hiệu chuẩn để đặt bề mặt hiện tại làm mốc 0° và tùy chọn khôi phục mốc mặc định.
- [x] Có thể điều chỉnh độ nhạy hoặc ngưỡng sai số dùng để xác định trạng thái cân bằng.

## 4. Phản hồi trạng thái và thao tác đo
- [x] Có phản hồi trực quan và rung khi thiết bị đạt trạng thái cân bằng trong ngưỡng cho phép.
- [x] Có thể khóa hoặc giữ kết quả đo để người dùng đọc số liệu sau khi căn chỉnh.

## 5. Hỗ trợ thiết bị, hướng màn hình và quyền cảm biến
- [x] Giao diện thích ứng cho điện thoại và máy tính bảng, hỗ trợ cả hướng dọc lẫn hướng ngang.
- [x] Có thông báo hướng dẫn và trạng thái khi trình duyệt hoặc thiết bị không hỗ trợ cảm biến hay chưa được cấp quyền.

## 6. Expo SDK và bản xem trước
- [x] Nâng dự án từ Expo SDK 57 lên SDK 58 để tương thích với Expo Go hiện tại.
- [x] Căn chỉnh các dependency theo SDK 58 và giữ Expo Web Preview cùng API đang hoạt động.

## 7. Hiển thị trục Y để căn chỉnh
- [x] Ở chế độ Mặt phẳng, hiển thị thước trục Y theo phương dọc màn hình để người dùng dễ căn.
- [x] Giữ chỉ số góc Y, hướng dấu và phản hồi cảm biến đồng bộ với vị trí con trượt trên thước dọc.

## 8. Tách lựa chọn trục X/Y
- [x] Kéo dài thước trục Y theo chiều dọc để người dùng dễ căn chỉnh.
- [x] Tách hiển thị trục Y và trục X bằng hai tab khác nhau để người dùng lựa chọn; mỗi tab hiển thị thước của trục đang chọn.

## 9. Quảng cáo Google AdMob ở chân màn hình
- [ ] Hiển thị banner Google AdMob ở chân màn hình, vùng quảng cáo rộng toàn màn hình và cao 80dp.
- [ ] Dùng AdMob App ID trong cấu hình Android và Banner Ad Unit ID đã cung cấp; trong bản development dùng test ad unit thay cho quảng cáo production.
- [ ] Thu thập consent UMP khi cần trước khi khởi tạo SDK/yêu cầu quảng cáo; cung cấp cấu hình để tạo custom Android build vì Expo Go không có native AdMob.

## 10. Dòng thông báo WordPress chạy ngang
- [ ] Lấy thông báo từ endpoint WordPress `https://ethuede.vn/wp-json/android-notices/v1/messages?app=can-bang-tam-mat-phang`.
- [ ] Hiển thị các tin có `display: "ticker"` thành dòng chữ chạy ngang ở cuối màn hình, cập nhật theo `poll_interval_seconds` do endpoint trả về.
- [ ] Khi API lỗi hoặc chưa có tin, hiển thị trạng thái dự phòng và không che vùng đo/nút thao tác.
