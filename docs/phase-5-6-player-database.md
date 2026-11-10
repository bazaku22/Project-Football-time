# Phase 5.6 — Player Database & Statistics

## Scope
- แยกข้อมูลนักเตะออกจากฐานข้อมูลการแข่งขันและรายการทดสอบ
- เก็บรหัสนักเตะจากผู้ให้บริการ, ทีม, ลีก, ฤดูกาล, สถิติ, แหล่งข้อมูล และเวลาที่ดึงข้อมูล
- ป้องกันข้อมูลซ้ำด้วยรหัสผู้ให้บริการ + ทีม + ฤดูกาล
- มีตัวกรองลีก/ทีม, ค้นหาชื่อนักเตะ และนำเข้า/ส่งออก JSON
- ข้อมูลที่นำเข้าบนอุปกรณ์เก็บใน Local Storage key `pft_players_v1` โดยไม่แตะ `pft_matches_v1` หรือ probability snapshots

## Provider and free-plan limits
ใช้ API-Football เป็นแหล่งข้อมูลหลักสำหรับการทดลอง Free plan ระบุ 100 requests/day และ 10 requests/minute พร้อมจำกัดฤดูกาลที่เข้าถึงได้ ดู https://www.api-football.com/pricing และ https://www.api-football.com/news/post/how-to-optimize-api-sports-calls-and-quota-usage

จากการทดสอบ API Key ของโปรเจกต์ ผู้ให้บริการตอบว่า Free plan เข้าถึงฤดูกาล 2022–2024 ได้ จึงกำหนดให้ importer ใช้ฤดูกาล 2024 (ข้อมูลย้อนหลัง) ไม่ใช่รายชื่อนักเตะปัจจุบันของฤดูกาล 2026–27

## Sync strategy
- ตรวจ daily quota ผ่าน endpoint `/status` ก่อนเริ่ม โดย endpoint นี้ไม่คิด quota ตามเอกสาร API
- หน่วงคำขออย่างน้อย 6.5 วินาที เพื่อให้อยู่ต่ำกว่า 10 requests/minute
- ใช้คำขอประมาณ 5 ครั้งเพื่ออ่านทีมทั้งห้าลีก และไม่เกิน 80 คำขอรายทีมต่อรอบ โดยกันโควตาไว้เป็น buffer
- ใช้ exact normalized team-name matching เท่านั้น; ทีมที่จับคู่ไม่ได้หรือไม่ชัดเจนจะถูกข้าม ไม่เดา
- ดึงหน้าแรกของ `/players` ต่อทีม และหมุนทีมที่เหลือในรอบถัดไป
- Workflow ทำงานตามตารางรายวันหรือสั่งรันเองได้ และ commit เฉพาะเมื่อได้ข้อมูลนักเตะจริง
- หาก API ผิดพลาดหรือไม่มีข้อมูล จะไม่เขียนทับฐานข้อมูลเดิม

## Data quality
- ค่าที่ไม่มีในแหล่งข้อมูลเก็บเป็น null/ไม่ทราบ ไม่เดาข้อมูล
- สถิติผูกกับทีม ลีก และฤดูกาล การย้ายทีมจึงอาจมีหลาย record ต่อ player ID
- ใช้ provider ID เป็นตัวระบุหลัก ไม่ใช้ชื่อเป็น ID ถาวร
- แสดงแหล่งข้อมูลและเวลาที่อัปเดต
- ห้ามเก็บ API key ใน browser, source code หรือ JSON

## Setup
เพิ่ม GitHub Actions secret ชื่อ `API_FOOTBALL_KEY` ใน Settings → Secrets and variables → Actions โดยสร้าง key จาก dashboard ของผู้ให้บริการและใส่ลง GitHub โดยตรง ห้ามส่ง key ผ่านแชต

## Current state
หน้าจอและ schema พร้อมแล้ว การ sync จริงอยู่ระหว่างทดสอบกับ Free plan โดยข้อมูลที่ได้ในระยะแรกจะเป็นสถิติย้อนหลังฤดูกาล 2024 เท่านั้น การครอบคลุมทีม/นักเตะขึ้นกับข้อมูลที่ API ให้บริการและข้อจำกัด pagination
