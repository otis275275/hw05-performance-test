---
name: performance-testing
description: Quy trình chuẩn hóa hướng dẫn AI Agent thiết kế, tham số hóa dữ liệu (Data-driven), thực thi các kịch bản kiểm thử hiệu năng (Load, Stress, Spike, Soak/Endurance) bằng k6 và phân tích đối soát số liệu log cho hệ thống eShop SUT.
---

# Agent Skill: Performance Testing & Metrics Audit Workflow

Kỹ năng này định nghĩa quy trình chuẩn 6 bước (S1 → S6) để AI Agent phối hợp cùng Kỹ sư kiểm thử thực thi kiểm thử hiệu năng toàn diện trên hệ thống eShop SUT.

---

## 1. Bảng quy trình Checkpoint 6 bước

| Bước | Tên bước | Đầu vào | Đầu ra & Điều kiện nghiệm thu |
|---|---|---|---|
| **S1** | **Xác định Scope & Workflow E2E** | Danh sách API backend SUT, đặc tả yêu cầu HW05 | Xác định rõ 3 nhóm endpoint: Auth-heavy (`/api/login`), Read-heavy (`GET /api/users/me`), Transactional (`PUT /api/users/me`). Thiết kế luồng nghiệp vụ E2E và cơ chế xử lý lockout. |
| **S2** | **Thiết kế Dữ liệu Data-Driven (CSV/JSON)** | Mô hình dữ liệu SUT (users, profiles, lockout) | Tạo các tập dữ liệu `users.csv`, `profiles.csv`, `lockout_accounts.csv` nạp qua `papaparse` hoặc `SharedArray` trong k6. |
| **S3** | **Sinh mã Kịch bản k6 (Load / Stress / Spike / Endurance)** | Tham số tải (VUs, Stages, Ramp-up, Thresholds) | Sinh các file kịch bản theo đúng quy chuẩn tên `{StudentID}_{ScenarioType}_{YYYYMMDD}.js`. Cấu hình 3 loại báo cáo listener khác nhau (Console Summary, Web Dashboard HTML, JSON Metric Export). |
| **S4** | **Chuẩn bị môi trường & Thực thi đo đạc** | SUT backend đang chạy, script reset DB | Chạy script reset trạng thái DB trước mỗi lần test. Thực thi k6 đồng thời thu thập bằng chứng giám sát phần cứng (`htop`, CPU, RAM). |
| **S5** | **Phân tích Log & Đối soát Sai lệch (Misinterpretation Hunt)** | Raw logs (`summary.json`, `.csv`, `.jtl`) | Sử dụng AI phân tích số liệu thô; đối soát độc lập với file log thực tế để phát hiện các điểm AI đọc sai/ảo giác; phân loại đề xuất tối ưu hóa (Feasible vs Hallucinated). |
| **S6** | **Đóng gói Bằng chứng & Báo cáo Tổng kết** | Toàn bộ artifacts từ S1 đến S5 | Tổng hợp Main Report (Markdown/PDF), AI Audit Log, Git Commit Log, Bảng tự đánh giá Self-Assessment. |

---

## 2. Hướng dẫn chi tiết từng bước cho Agent

### Bước S1: Phân tích luồng nghiệp vụ E2E
Agent phải bảo đảm kịch bản kiểm thử không tách rời các API đơn lẻ mà phải xâu chuỗi thành hành vi người dùng thực tế:
1. **Auth-heavy**: Thực hiện `POST /api/login` với thông tin xác thực để trích xuất `token` (JWT). Kịch bản Stress/Spike phải kiểm tra trường hợp tài khoản bị khóa (`403 Forbidden`) sau khi đăng nhập sai nhiều lần.
2. **Read-heavy**: Sử dụng JWT token gửi request `GET /api/users/me` để kiểm tra độ trễ đọc dữ liệu cá nhân.
3. **Transactional**: Gửi request `PUT /api/users/me` kèm payload JSON cập nhật thông tin cá nhân (`name`, `shipping_address`, `phone`), kiểm tra phản hồi `200 OK` và ghi nhận tác động ghi vào SQLite.

### Bước S2: Thiết kế bộ dữ liệu Data-Driven
* Agent sử dụng thư viện phân tích CSV hoặc `SharedArray` trong k6 để chia sẻ dữ liệu bộ nhớ giữa các Virtual Users (VUs).
* Đảm bảo bộ dữ liệu có đủ số lượng bản ghi để tránh xung đột ghi/đọc đồng thời giữa các VUs.

### Bước S3: Cấu hình Stages và Thresholds theo chuẩn loại kịch bản
1. **Load Test**:
   * Mục tiêu: Đánh giá hiệu năng dưới tải dự kiến bình thường.
   * Cấu hình: Ramp-up 30s lên 20 VUs, duy trì 1m, ramp-down 15s.
   * Thresholds: `http_req_duration: ['p(95)<500']`, `http_req_failed: ['rate<0.01']`.
2. **Stress Test**:
   * Mục tiêu: Tìm điểm gãy (breaking point) của hệ thống khi vượt quá tải thiết kế.
   * Cấu hình: Ramp-up dần từ 10 → 50 → 100 VUs.
   * Thresholds: `http_req_duration: ['p(95)<1500']`, `http_req_failed: ['rate<0.05']`.
3. **Spike Test**:
   * Mục tiêu: Đánh giá khả năng chịu đột biến tải tức thì và khả năng tự hồi phục sau đột biến.
   * Cấu hình: Tải nền thấp (5 VUs) -> Bùng phát cực nhanh lên 80 VUs trong 10s -> Giữ 20s -> Giảm đột ngột về 5 VUs.
4. **Endurance / Soak Test**:
   * Mục tiêu: Chạy liên tục 10–15 phút ở mức tải ổn định để phát hiện rò rỉ bộ nhớ (memory leak) hoặc tích tụ khóa (lock contention) trong SQLite.

### Bước S4: Reset môi trường trước mỗi lần chạy
Trước khi chạy mỗi kịch bản, Agent bắt buộc phải gọi script `reset_db.js` để:
* Xóa trạng thái khóa tài khoản (`locked_until = NULL`, `login_attempts = 0`).
* Đảm bảo tính lặp lại (reproducibility) của kết quả đo đạc.

### Bước S5: Quy tắc Săn lỗi AI (Misinterpretation Hunt)
Khi phân tích kết quả log:
* Agent phải đọc trực tiếp từ file JSON summary hoặc log thô, không được suy diễn số liệu.
* Đối chiếu kết quả giữa phân tích của AI với file log gốc: Nếu AI báo p95 = 250ms nhưng log ghi 380ms, phải lập bảng chỉ ra sai lệch cụ thể.
* Phân loại đề xuất tối ưu:
  * **Feasible (Khả thi)**: Đánh chỉ mục Index trên cột thường xuyên truy vấn `WHERE email = ?`, bật chế độ SQLite WAL (`PRAGMA journal_mode = WAL;`).
  * **Hallucinated (Ảo giác / Không khả thi)**: Đề xuất Redis Cluster hoặc Microservices sharding cho một ứng dụng monolithic demo SQLite cục bộ.

---

## 3. Các Scripts Bổ trợ trong Skill
* `scripts/reset_db.js`: Khởi tạo lại trạng thái database và mở khóa tài khoản.
* `scripts/run_scenario.sh`: Tự động hóa quá trình chạy k6, xuất Web-Dashboard HTML và trích xuất JSON metrics.
* `scripts/audit_metrics.py`: Công cụ Python đối soát độc lập các chỉ số p50, p90, p95, p99, throughput từ file log thô.
