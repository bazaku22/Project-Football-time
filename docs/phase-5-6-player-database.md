# Phase 5.6 — Player Database & Statistics

## Scope
- แยกข้อมูลนักเตะออกจากฐานข้อมูลการแข่งขันและรายการทดสอบ
- เก็บรหัสนักเตะจากผู้ให้บริการ, ทีม, ลีก, ฤดูกาล, สถิติ, แหล่งข้อมูล และเวลาที่ดึงข้อมูล
- ป้องกันข้อมูลซ้ำด้วยรหัสผู้ให้บริการ + ทีม + ฤดูกาล
- มีตัวกรองลีก/ทีม, ค้นหาชื่อนักเตะ และนำเข้า/ส่งออก JSON
- ข้อมูลที่นำเข้าบนอุปกรณ์เก็บใน Local Storage key `pft_players_v1` โดยไม่แตะ `pft_matches_v1` หรือ probability snapshots

## Provider
ใช้ API-Football เป็นแหล่งข้อมูลหลักสำหรับการทดลอง Free plan ระบุ 100 requests/day แต่จำกัดฤดูกาลและ pagination; importer ดึงหน้าแรกต่อทีมและจำกัดจำนวนทีมต่อรอบ ดู https://www.api-football.com/pricing และ https://www.api-football.com/documentation-v3

## Data quality
- ค่าที่ไม่มีในแหล่งข้อมูลเก็บเป็น null/ไม่ทราบ ไม่เดาข้อมูล
- สถิติผูกกับทีม ลีก และฤดูกาล การย้ายทีมจึงอาจมีหลาย record ต่อ player ID
- ใช้ provider ID เป็นตัวระบุหลัก ไม่ใช้ชื่อเป็น ID ถาวร
- แสดงแหล่งข้อมูลและเวลาที่อัปเดต
- ห้ามเก็บ API key ใน browser, source code หรือ JSON

## Setup
เพิ่ม GitHub Actions secret ชื่อ `API_FOOTBALL_KEY` ใน Settings → Secrets and variables → Actions โดยสร้าง key จาก dashboard ของผู้ให้บริการและใส่ลง GitHub โดยตรง ห้ามส่ง key ผ่านแชต
รัน workflow แบบ manual บน feature branch เพื่อทดสอบก่อนขยาย การทำงานอัตโนมัติจะข้ามการ sync หากยังไม่มี secret

## Current state
มี schema และหน้าจอพร้อม แต่ไฟล์กลางยังว่างจนกว่าจะตั้งค่า API key และรัน workflow สำเร็จ สามารถใช้ JSON import/export ระหว่างรอได้
