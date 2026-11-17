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


---

### Lần 5: Tư vấn nguyên tắc xác định và tinh chỉnh ngưỡng hiệu năng (Thresholds)
- **Tên công cụ AI**: Antigravity (Gemini 3.8 Flash)
- **Ngày và giờ**: 2026-11-17 09:28:34
- **Câu lệnh (Prompt)**:
  ```text
  làm sao ta biết nên đặt threshold nào, liệu ta có adjust sau mỗi lần test không
  ```
- **Kết quả do AI tạo ra**:
  - Phân tích cơ sở lý thuyết thiết lập Thresholds:
    1. Dựa trên SLA/SLO công nghiệp chuẩn cho E-commerce (Read < 200ms, Auth < 500ms, Transactional < 500ms, Error rate < 1%).
    2. Dựa trên đo đạc Baseline thực nghiệm (chạy tải tối thiểu 1 VU để đo network & runtime overhead).
    3. Phân tầng theo mục tiêu của từng loại kịch bản: Load test áp ngưỡng nghiêm ngặt; Stress test nới lỏng để dò điểm gãy; Spike test tập trung vào khả năng tự hồi phục sau sốc tải; Soak/Endurance tập trung vào độ trôi p95 và ổn định bộ nhớ.
  - Khẳng định tính tất yếu của việc điều chỉnh (adjust) threshold qua các lần chạy:
    - AI thường đưa ra các threshold lý thuyết chung chung, không tính đến đặc thù phần cứng (CPU/RAM) và điểm nghẽn kiến trúc (SQLite database lock contention khi ghi đồng thời).
    - Việc sinh viên đối soát log thực tế, phản biện threshold của AI và tinh chỉnh lại chính là minh chứng cốt lõi cho kỹ năng Human Review (Bloom-AI Level G9.3 / G9.4) theo đúng yêu cầu Task 1 & Task 2 của đề bài.


---

### Lần 6: Giải thích tính bắt buộc của mục "Hallucinated" trong Bước S5 theo barem đề bài
- **Tên công cụ AI**: Antigravity (Gemini 3.8 Flash)
- **Ngày và giờ**: 2026-11-17 09:31:24
- **Câu lệnh (Prompt)**:
  ```text
  eshop-sut/skills/performance-testing/SKILL.md ở bươc 5, phần hallucinate có cần thiết k? tui nghĩ nó đang làm quá phức tạp lên
  ```
- **Kết quả do AI tạo ra**:
  - Trích dẫn trực tiếp yêu cầu bắt buộc từ đề bài HW05 (Mục 6 - Task 2, dòng 208–211):
    > *"Judge the AI's recommendations. Have the AI propose optimizations (e.g., adding a database index, a connection pool, or enabling SQLite WAL) and classify each as feasible or hallucinated, with reasoning."*
  - Làm rõ mục đích của giảng viên: Đây là tiêu chí đánh giá năng lực tư duy phản biện (Critical Thinking - Bloom Level G9.3 / G9.4). Giảng viên muốn sinh viên không tin mù quáng vào các lời khuyên của AI mà phải phân định rõ cái nào áp dụng được cho hệ thống thực tế (Node.js/SQLite), cái nào là AI "chém gió" / ảo giác (như khuyên cấu hình connection pool hay clustering cho SQLite).
  - Đề xuất tinh gọn cách diễn đạt trong SKILL.md để dễ hiểu và thực dụng hơn nhưng vẫn bám sát 100% barem chấm điểm 10 điểm của Task 2.


---

### Lần 7: Lập kế hoạch chi tiết triển khai Task 1 (AI-assisted Test Design & Execution)
- **Tên công cụ AI**: Antigravity (Gemini 3.8 Flash)
- **Ngày và giờ**: 2026-11-17 09:33:15
- **Câu lệnh (Prompt)**:
  ```text
  oke ta sẽ bắt đầu với task 1 trước, lập plan cho tui ta sẽ làm gì để tui dễ dàng đối chiếu
  ```
- **Kết quả do AI tạo ra**:
  - Xây dựng bản kế hoạch chi tiết (Action Plan) cho Task 1 gồm 5 giai đoạn rõ ràng:
    1. **Giai đoạn 1 (Dữ liệu & Môi trường):** Chuẩn bị tập dữ liệu CSV Data-Driven (`users.csv`, `profiles.csv`, `lockout_accounts.csv`) và hoàn thiện script reset database.
    2. **Giai đoạn 2 (Thiết kế kịch bản với AI & Human Review):** Sinh mã kịch bản Load, Stress, Spike, Endurance theo đúng quy chuẩn tên `{StudentID}_{ScenarioType}_{YYYYMMDD}.js`. Lập bảng Human Review chỉ ra lỗi AI sinh ra (thiếu think-time, sai threshold, thiếu xử lý 403 lockout).
    3. **Giai đoạn 3 (Thực thi & Thu thập bằng chứng đa góc nhìn):** Chạy đo đạc với k6 xuất 3 dạng báo cáo khác nhau (Console Summary, Web Dashboard HTML tĩnh, JSON Summary thô); chụp ảnh màn hình chạy cùng `htop` và bảng phần cứng.
    4. **Giai đoạn 4 (Xác định ngưỡng bền vững Endurance Threshold):** Chạy kịch bản Endurance 10–15 phút tìm ngưỡng RPS ổn định và trần bộ nhớ.
    5. **Giai đoạn 5 (Tài liệu hóa & Git Commit):** Đóng gói raw logs, HTML reports và ghi log commit Git cho từng bước.


---

### Lần 8: Triển khai Giai đoạn 1 - Chuẩn bị Dữ liệu Data-Driven (CSV) và Đồng bộ Database
- **Tên công cụ AI**: Antigravity (Gemini 3.8 Flash)
- **Ngày và giờ**: 2026-11-17 09:37:43
- **Câu lệnh (Prompt)**:
  ```text
  oke ta bắt đầu giai đoạn 1 trước đi
  ```
- **Kết quả do AI tạo ra**:
  - Tạo thư mục lưu trữ dữ liệu kiểm thử tại `eshop-sut/performance-tests/data/`.
  - Soạn thảo 3 tệp dữ liệu CSV chuẩn hóa phục vụ Data-driven testing:
    1. `users.csv`: Chứa danh sách 20 tài khoản người dùng hợp lệ để các VUs đăng nhập song song mà không tranh chấp.
    2. `profiles.csv`: Chứa 20 bộ thông tin hồ sơ đa dạng (`name`, `shipping_address`, `phone`) dùng cho API `PUT /api/users/me`.
    3. `lockout_accounts.csv`: Chứa thông tin tài khoản dùng để kích hoạt ngưỡng khóa sau 3 lần sai mật khẩu (`403 Forbidden`).
  - Nâng cấp script `reset_db.js` để tự động gỡ khóa và seed đồng bộ 20 tài khoản này vào cơ sở dữ liệu SQLite `database.sqlite`.
  - Thực thi reset và xác minh toàn bộ dữ liệu mẫu đã sẵn sàng trong database.


---

### Lần 9: Phản biện tài khoản mặc định theo README SUT và cơ chế tương thích dữ liệu
- **Tên công cụ AI**: Antigravity (Gemini 3.8 Flash)
- **Ngày và giờ**: 2026-11-17 09:42:39
- **Câu lệnh (Prompt)**:
  ```text
  tại sao các csv dù là password đúng nhưng nó vẫn sai theo readme? readme có cung cấp các tài khoản sẵn đso
  ```
- **Kết quả do AI tạo ra**:
  - Đối soát tài liệu `eshop-sut/README.md` (Mục 1, dòng 21-25) và file khởi tạo `backend/database.js` (dòng 90-95):
    - Tài khoản mặc định duy nhất được SUT cung cấp sẵn từ đầu là:
      * Admin: `admin@eshop.com` / `Admin123!`
      * User: `test@eshop.com` / `Test1234!`
  - Phân tích rủi ro tương thích: Nếu mang kịch bản test nộp bài mà TAs chỉ chạy lệnh gốc `node database.js` (reset DB về ban đầu của repository) mà không chạy seed mở rộng, thì các tài khoản tự sinh như `user01@eshop.com` sẽ bị lỗi `401 Unauthorized` (do tài khoản chưa từng tồn tại trong DB gốc).
  - Thống nhất giải pháp chuẩn hóa dữ liệu:
    1. Đưa tài khoản chuẩn từ README (`test@eshop.com` / `Test1234!`) làm tài khoản cốt lõi trong `users.csv`.
    2. Trong kịch bản test hoặc script khởi tạo, hỗ trợ tự động đăng ký (`POST /api/register`) nếu tài khoản chưa có trong DB, hoặc tận dụng tài khoản chuẩn sẵn có để đảm bảo kịch bản chạy độc lập thành công 100% trên bất kỳ máy nào của giảng viên.


---

### Lần 10: Cập nhật tệp dữ liệu CSV chuẩn hóa theo tài khoản mặc định của SUT README
- **Tên công cụ AI**: Antigravity (Gemini 3.8 Flash)
- **Ngày và giờ**: 2026-11-17 09:45:08
- **Câu lệnh (Prompt)**:
  ```text
  oke cập nhập đi
  ```
- **Kết quả do AI tạo ra**:
  - Tái cấu trúc lại tệp `performance-tests/data/users.csv` sử dụng trực tiếp các tài khoản gốc được đặc tả trong README:
    * `test@eshop.com` / `Test1234!` (User chuẩn)
    * `admin@eshop.com` / `Admin123!` (Admin)
  - Cập nhật tệp `performance-tests/data/lockout_accounts.csv` sử dụng tài khoản `test@eshop.com` với mật khẩu sai `WrongPass123!` nhằm kích hoạt đúng cơ chế khóa tài khoản theo FR-02.
  - Tối ưu script `skills/performance-testing/scripts/reset_db.js` để bảo đảm phục hồi tài khoản chuẩn và mở khóa sau mỗi vòng lặp kiểm thử.
