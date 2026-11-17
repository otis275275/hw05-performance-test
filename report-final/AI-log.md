# AI Audit Report (HW05 – Performance Testing)

- **Môn học**: Kiểm thử phần mềm
- **Bài tập**: HW05 – Performance Testing (Individual Assignment)
- **Họ và tên sinh viên**: Lê Trung Thành Đạt
- **MSSV**: 23120228
- **Tên công cụ AI sử dụng**: Antigravity (Gemini 3.8 Flash)

---

## Tuyên bố sử dụng AI
> **Tôi sử dụng công cụ AI cho những tác vụ sau trong bài tập cá nhân HW05:**
> 1. Phân tích đề bài, hệ thống hóa yêu cầu kỹ thuật và phạm vi kiểm thử (Scope) theo luồng E2E: Login -> Update Profile -> Lockout.
> 2. Hỗ trợ tải, cài đặt và cấu hình công cụ k6 trên môi trường Linux Ubuntu.
> 3. Thiết kế và sinh mã kịch bản kiểm thử hiệu năng Data-driven (Load Test, Stress Test, Spike Test, Endurance Test) bằng k6 bao phủ đầy đủ 3 nhóm endpoint (Auth-heavy, Read-heavy, Transactional).
> 4. Hỗ trợ phân tích log số liệu thô (raw summary/JSON metrics), đối soát và phát hiện lỗi AI hiểu sai số liệu (Misinterpretation hunt).
> 5. Đề xuất kiến trúc Continuous Performance Testing (Disrupt G9.6) tích hợp Git commit watcher và phân tích trade-off.

---

## Nhật ký chi tiết các lần tương tác với AI

### Lần 1: Khảo sát hiện trạng mã nguồn SUT và phân tích đề bài HW05
- **Tên công cụ AI**: Antigravity (Gemini 3.8 Flash)
- **Ngày và giờ**: 2026-11-17 08:54:29
- **Câu lệnh (Prompt)**:
  ```text
  Đọc source hiện có và yêu cầu đề trong 2026.HW05.Performance Testing_En.md ta sẽ bắt đầu làm
  ```
- **Kết quả do AI tạo ra**:
  - Đọc và phân tích toàn diện 17 mục trong đề bài HW05 (Mục tiêu, Guiding Principles, 3 nhóm endpoint, 3 bài test Load/Stress/Spike, yêu cầu Anti-Cheat, định dạng nộp bài).
  - Khảo sát mã nguồn backend eShop SUT (`eshop-sut/backend/server.js`, database SQLite, danh sách API hiện hữu).
  - Kiểm tra môi trường hệ thống (Ubuntu Linux, Node.js v24.18.0, OpenJDK 25) và đề xuất các thông tin cần thiết lập ban đầu (MSSV, công cụ chọn, kịch bản E2E).

---

### Lần 2: Cài đặt công cụ k6 trên môi trường Linux
- **Tên công cụ AI**: Antigravity (Gemini 3.8 Flash)
- **Ngày và giờ**: 2026-11-17 09:03:38
- **Câu lệnh (Prompt)**:
  ```text
  đầu tiên hãy tải k6 cho tui
  ```
- **Kết quả do AI tạo ra**:
  - Tải bản phát hành chính thức k6 `v2.4.0` (linux-amd64) từ GitHub repository của Grafana Labs.
  - Giải nén binary `k6` vào thư mục người dùng `~/.local/bin/k6` và cấp quyền thực thi (`chmod +x`).
  - Thiết lập biến môi trường `PATH` trong file `~/.bashrc` và xác minh lệnh `k6 version` hoạt động thành công.

---

### Lần 3: Xác định luồng E2E, thông tin sinh viên và thiết lập phạm vi thư mục
- **Tên công cụ AI**: Antigravity (Gemini 3.8 Flash)
- **Ngày và giờ**: 2026-11-17 09:15:56
- **Câu lệnh (Prompt)**:
  ```text
  flow E2E của tui là Login -> update profile -> lockout. Với auth là api login hoặc logout, read là /me, transactional là PUT /me. mã số sinh viên là 23120228. Họ tên là Lê Trung Thành Đạt, ta sẽ quan tâm foldẻ eshop-sut thôi. eshop-sut/report-final/AI-log.md kể từ giờ bất kì câu prompt nào giữa bạn và tôi trong đoạn chat này đều phải append log vào file AI log theo đúng template trong đề bài, nhăcs lại là chỉ tập trung vào foldẻ eshop-sut nhưng cái bên ngoài là cho prọect khác
  ```
- **Kết quả do AI tạo ra**:
  - Ghi nhận thông tin sinh viên: **Lê Trung Thành Đạt - MSSV: 23120228**.
  - Xác nhận luồng E2E hoàn chỉnh:
    - **Auth-heavy**: `POST /api/login` (đăng nhập hợp lệ) & kịch bản gây khóa tài khoản (lockout) sau 3 lần sai hoặc kiểm tra trạng thái lockout `403`.
    - **Read-heavy**: `GET /api/users/me` (đọc thông tin người dùng dựa vào Bearer token).
    - **Transactional**: `PUT /api/users/me` (cập nhật thông tin profile: `name`, `shipping_address`, `phone`).
  - Khoanh vùng tuyệt đối phạm vi làm việc trong thư mục `eshop-sut/`.
  - Khởi tạo và liên tục ghi log tương tác vào file `eshop-sut/report-final/AI-log.md` theo chuẩn đề bài.


---

### Lần 4: Xây dựng Agent Skill chuyên trách Performance Testing & Metrics Audit
- **Tên công cụ AI**: Antigravity (Gemini 3.8 Flash)
- **Ngày và giờ**: 2026-11-17 09:18:52
- **Câu lệnh (Prompt)**:
  ```text
  trước héte ta cần build skill cho agent trước, b hãy viết đi và tôi sẽ check
  ```
- **Kết quả do AI tạo ra**:
  - Khởi tạo thư mục kỹ năng chuẩn tại `eshop-sut/skills/performance-testing/`.
  - Soạn thảo tài liệu đặc tả `SKILL.md` gồm bảng quy trình 6 bước (S1: Scope E2E -> S2: Data-Driven -> S3: Sinh kịch bản k6 -> S4: Reset & Chạy đo đạc -> S5: Săn lỗi AI Misinterpretation -> S6: Đóng gói báo cáo).
  - Viết bộ 3 script bổ trợ trong `skills/performance-testing/scripts/`:
    1. `reset_db.js`: Script Node.js reset trạng thái khóa tài khoản (`locked_until = NULL`, `login_attempts = 0`) và seed dữ liệu người dùng chuẩn.
    2. `run_scenario.sh`: Script Bash tự động chạy k6 xuất Web Dashboard HTML và lưu file JSON summary.
    3. `audit_metrics.py`: Công cụ Python trích xuất và tính toán độc lập các phân vị độ trễ (p50, p90, p95, p99), thông lượng RPS và tỷ lệ lỗi để phục vụ đối soát.
