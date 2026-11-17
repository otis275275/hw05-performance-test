# HW05 – Performance Testing (Individual Assignment)

- **Họ và tên sinh viên:** Lê Trung Thành Đạt
- **MSSV:** 23120228
- **Lớp:** CQ2023/31
- **Công cụ kiểm thử:** k6 (v2.4.0) – Bonus Tool
- **Hệ thống kiểm thử (SUT):** eShop (Node.js/Express + SQLite)
- **Kho lưu trữ GitHub:** [hw05-performance-test](https://github.com/otis275275/hw05-performance-test)
- **Liên kết Video Demo Thuyết minh (YouTube):** *[Cập nhật link video YouTube Unlisted của bạn]*

---

## 1. TỔNG KẾT KIỂM THỬ (TEST SUMMARY REPORT)

### 1.1. Các kịch bản đã thực thi (Scenarios Run)
1. **Load Testing (`23120228_Load_20261117.js`):** Tải danh định 15 VUs trong 1 phút 35 giây. Đạt 100% SLA (`p95 = 12.33ms`, lỗi `0.00%`).
2. **Stress Testing (`23120228_Stress_20261117.js`):** Tải bậc thang leo dốc 20 $\rightarrow$ 50 $\rightarrow$ 100 VUs trong 1 phút 55 giây. Xử lý 5,124 requests, đạt đỉnh Throughput 43.23 req/s.
3. **Spike Testing (`23120228_Spike_20261117.js`):** Sốc tải tức thì từ 5 VUs lên 80 VUs trong 10 giây, giữ 20s rồi hạ về 5 VUs. Hệ thống kích hoạt cơ chế khóa tài khoản `403` khi chịu sốc tải và tự hồi phục hoàn toàn sau khi tải giảm.
4. **Endurance / Soak Testing (`23120228_Endurance_20261117.js`):** Ngâm tải ổn định 25 VUs liên tục suốt 11 phút (12,602 requests).

---

### 1.2. Nhóm Endpoint Bao phủ (Endpoint Groups Covered)
Luồng nghiệp vụ End-to-End (E2E) kết nối trọn vẹn cả 3 nhóm endpoint:
* **Auth-heavy:** `POST /api/login` (Xác thực lấy JWT Token) và kiểm tra cơ chế khóa tài khoản Lockout (`401/403`).
* **Read-heavy:** `GET /api/users/me` (Truy vấn hồ sơ cá nhân qua Bearer token).
* **Transactional:** `PUT /api/users/me` (Cập nhật thông tin cá nhân: tên, địa chỉ, số điện thoại từ CSV).

---

### 1.3. Ngưỡng Bền vững Phần cứng (Endurance Thresholds)
* **Thông lượng tối đa bền vững (Max Stable RPS):** **19.02 req/s** (duy trì 10 phút không lỗi) và **43.23 req/s** (đỉnh tải 100 VUs).
* **Trần bộ nhớ (Memory Ceiling):** **141.9 MB** (duy trì nằm ngang suốt 10 phút, không có hiện tượng rò rỉ bộ nhớ - Zero Memory Leak).
* **Độ trôi độ trễ (p95 Drift):** $\approx 0\text{ ms}$ (p95 phút đầu 11.15ms, phút cuối 11.28ms, không bị suy thoái).

---

### 1.4. Phát hiện Sự cố & Hồ sơ Tài liệu Bổ trợ (Bugs & Supporting Docs)
* **BUG-01 (Sai logic đếm số lần đăng nhập):** `server.js:54` cộng `login_attempts + 2` khiến tài khoản bị khóa sau chỉ 2 lần sai mật khẩu thay vì 3 lần theo đặc tả FR-02. Chi tiết tại [BUG_REPORT.md](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/BUG_REPORT.md) / [BUG_REPORT.pdf](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/BUG_REPORT.pdf).
* **PERF-01 (SQLite Table Lock Contention):** Khóa độc quyền khi ghi đồng thời 100 VUs. Đề xuất bật `PRAGMA journal_mode = WAL;`.
* **Cẩm nang Vấn đáp (Oral Defense Guide):** Bộ câu hỏi & trả lời kỹ thuật chuyên sâu (k6 vs JMeter, `SharedArray`, Go engine, SQLite concurrency, CI/CD regression detection) tại [ORAL_DEFENSE_GUIDE.md](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/ORAL_DEFENSE_GUIDE.md) / [ORAL_DEFENSE_GUIDE.pdf](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/ORAL_DEFENSE_GUIDE.pdf).

---

### 1.5. Danh mục Hồ sơ Nộp bài (Submission Deliverables)
1. **Báo cáo chính:** [MAIN_REPORT.md](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/MAIN_REPORT.md) & [MAIN_REPORT.pdf](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/MAIN_REPORT.pdf)
2. **Nhật ký AI tương tác (AI Audit Log):** [AI-log.md](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/AI-log.md) & [AI-log.pdf](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/AI-log.pdf)
3. **Báo cáo Lỗi & Hiệu năng:** [BUG_REPORT.md](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/BUG_REPORT.md) & [BUG_REPORT.pdf](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/BUG_REPORT.pdf)
4. **Hướng dẫn Vấn đáp Bảo vệ:** [ORAL_DEFENSE_GUIDE.md](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/ORAL_DEFENSE_GUIDE.md) & [ORAL_DEFENSE_GUIDE.pdf](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/ORAL_DEFENSE_GUIDE.pdf)
5. **Kịch bản kiểm thử (Performance Tests):**
   - [23120228_Load_20261117.js](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/performance-tests/23120228_Load_20261117.js)
   - [23120228_Stress_20261117.js](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/performance-tests/23120228_Stress_20261117.js)
   - [23120228_Spike_20261117.js](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/performance-tests/23120228_Spike_20261117.js)
   - [23120228_Endurance_20261117.js](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/performance-tests/23120228_Endurance_20261117.js)
6. **Báo cáo trực quan & Dữ liệu thô:**
   - [Thư mục HTML Reports (4 scenarios)](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/html-reports/)
   - [Thư mục Raw JSON Logs (4 scenarios)](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/raw-logs/)
7. **Lịch sử Git:** [GIT_COMMIT_LOG.txt](file:///home/sv/Downloads/seminar%20testing/Software-Testing-Seminar-Group10/eshop-sut/report-final/GIT_COMMIT_LOG.txt)

---

## 2. BẢNG TỰ ĐÁNH GIÁ ĐIỂM SỐ (SELF-ASSESSMENT TABLE)

| STT | Tiêu chí đánh giá theo Barem đề bài | Điểm tối đa | Điểm tự đánh giá | Minh chứng & Ghi chú |
|:---:|---|:---:|:---:|---|
| **1** | **Task 1 — Load Testing** | 30 | **30** | Đầy đủ kịch bản k6 chuẩn tên, dữ liệu CSV `SharedArray`, E2E 3 nhóm endpoint, p95=12.33ms, lỗi 0%, xuất đủ 3 report views. |
| **2** | **Task 1 — Stress Testing** | 20 | **20** | Tải bậc thang leo dốc 20 $\rightarrow$ 50 $\rightarrow$ 100 VUs, 5,124 requests, Throughput 43.23 req/s, đối soát điểm gãy I/O. |
| **3** | **Task 1 — Spike Testing** | 20 | **20** | Sốc tải đột ngột 5 $\rightarrow$ 80 VUs trong 10s, ghi nhận cơ chế lockout tự kích hoạt và hệ thống tự phục hồi hoàn toàn sau sốc tải. |
| **4** | **Task 2 — AI Analysis & Misinterpretation Hunt** | 10 | **10** | Lập bảng săn lỗi AI chỉ ra 3 lỗi sai lệch số liệu thực tế; thẩm định 4 đề xuất tối ưu (Feasible vs Hallucinated) với lập luận sâu sắc. |
| **5** | **Task 3 — Continuous Performance Testing Proposal (G9.6)** | 10 | **10** | Đề xuất mô hình CPT hoàn chỉnh, có sơ đồ Mermaid Flowchart, bộ lọc commit, cơ chế phát hiện $\Delta \text{p95} > 20\%$ và phân tích trade-offs. |
| **6** | **Agent Skill & Đóng gói Bằng chứng** | 10 | **10** | Xây dựng Agent Skill hoàn chỉnh với 6 bước S1-S6, bộ 3 script bổ trợ, bài test Endurance 11 phút xác định ngưỡng phần cứng và Memory Ceiling 141.9 MB. |
|  | **TỔNG ĐIỂM TỰ ĐÁNH GIÁ** | **100** | **100** | **100/100 (Điểm xuất sắc)** |
