ACTION PLAN: TASK 1 — AI-ASSISTED TEST DESIGN & EXECUTION
Mục tiêu nghiệm thu
MSSV: 23120228
Workflow E2E: Login -> GET /me -> PUT /me -> Check Lockout (403)
Công cụ: k6 (bonus)
3 kịch bản chính: Load Test, Stress Test, Spike Test.
1 kịch bản bổ trợ: Endurance Test (10–15 phút tìm ngưỡng phần cứng tối đa).
3 định dạng báo cáo không trùng lặp: (1) Console CLI Summary, (2) Web Dashboard HTML tương tác, (3) JSON Metric Log thô.
Giai đoạn 1: Chuẩn bị Dữ liệu Data-Driven & Tiền xử lý DB
 1.1. Tạo thư mục eshop-sut/performance-tests/data/ chứa 3 file CSV:
users.csv: Danh sách tài khoản hợp lệ để login lấy JWT token.
profiles.csv: Danh sách dữ liệu mẫu để gửi request transactional PUT /me (name, shipping_address, phone).
lockout_accounts.csv: Danh sách tài khoản và mật khẩu sai để test cơ chế khóa tài khoản (lockout) và kiểm tra mã lỗi 403.
 1.2. Cập nhật database SQLite cục bộ đảm bảo các tài khoản này tồn tại và script reset_db.js hoạt động hoàn hảo.
Giai đoạn 2: Thiết kế Kịch bản bằng AI & Phản biện (Human Review)
 2.1. Đặt tên file theo đúng chuẩn đề bài:
23120228_Load_20261117.js (Tải bình thường: 15–20 VUs, đánh giá SLA p95 < 500ms).
23120228_Stress_20261117.js (Tải tăng dần: 20 → 60 → 100 VUs, tìm điểm gãy).
23120228_Spike_20261117.js (Tải bùng phát tức thì: 5 VUs vọt lên 80 VUs trong 10s rồi tụt về 5 VUs, kiểm tra khả năng tự hồi phục).
23120228_Endurance_20261117.js (Tải ngâm ổn định 10–15 phút, phát hiện rò rỉ RAM).
 2.2. Human Review (Bắt lỗi AI):
Để AI sinh bản draft đầu tiên.
Lập bảng Human Review chỉ rõ các lỗi AI hay mắc:
Think-time phi thực tế: AI thường quên sleep() khiến các VUs spam request liên tục như DDOS.
Threshold cứng nhắc: Áp threshold đọc cho API ghi đĩa SQLite khiến test fail oan.
Thiếu xử lý logic Lockout: AI không biết sau 3 lần sai tài khoản bị khóa trong 3 phút (403 Forbidden).
Weak Assertions: Chỉ check status === 200 mà không kiểm tra cấu trúc body trả về.
Giai đoạn 3: Thực thi đo đạc & Thu thập Bằng chứng
 3.1. Khởi động SUT backend (PORT=3000).
 3.2. Thu thập thông số phần cứng máy kiểm thử (CPU, RAM, OS, Hostname FIT.HCMUS) lưu vào bảng đặc tả.
 3.3. Thực thi từng kịch bản, tự động reset DB trước mỗi lần chạy:
Chạy Load Test -> Xuất Load_dashboard.html, Load_summary.json.
Chạy Stress Test -> Xuất Stress_dashboard.html, Stress_summary.json.
Chạy Spike Test -> Xuất Spike_dashboard.html, Spike_summary.json.
 3.4. Chụp ảnh màn hình k6 chạy đồng thời với htop (giám sát CPU/RAM của tiến trình node server).
Giai đoạn 4: Xác định Ngưỡng Bền vững (Endurance Threshold)
 4.1. Chạy bài test ngâm 10–15 phút ở mức tải ổn định (25–30 VUs).
 4.2. Trích xuất các chỉ số định lượng cụ thể:
Max Stable RPS (Số request/giây ổn định tối đa mà không phát sinh lỗi).
Memory Ceiling (Mức RAM cao nhất của tiến trình Node.js backend).
p95 Latency Drift (Độ chênh lệch p95 giữa phút đầu và phút cuối).
Giai đoạn 5: Git Commit & Bàn giao Artifacts
 5.1. Tạo commit Git riêng cho từng bước (Data, Test plans, Raw logs, Hardware report).
 5.2. Trích xuất Git log vào file text chuẩn.