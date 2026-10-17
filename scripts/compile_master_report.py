#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Master compiler script to assemble all preliminary pages (i to x) and
chapter pages (1 to 82) into a single, comprehensive text document.
"""

import os
import sys

# Add directory to python path
cur_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, cur_dir)

from report_sections.pages_front_matter import PAGES as FM_PAGES
from report_sections.pages_ch1_to_ch3 import PAGES as CH1_3_PAGES
from report_sections.pages_ch4 import PAGES as CH4_PAGES
from report_sections.pages_ch5 import PAGES as CH5_PAGES
from report_sections.pages_ch6 import PAGES as CH6_PAGES
from report_sections.pages_ch7 import PAGES as CH7_PAGES
from report_sections.pages_ch8_to_appendices import PAGES as CH8_APP_PAGES

def compile_report():
    print("Compiling Master 80-Page Final Engineering Project Report...")
    
    report_parts = []
    
    # 1. Front matter pages i to x
    roman_order = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']
    for p in roman_order:
        if p not in FM_PAGES:
            raise KeyError(f"Missing preliminary page: {p}")
        report_parts.append(FM_PAGES[p].strip())
        report_parts.append("\n\n" + "\x0c" + "\n\n") # Form feed for page break
        
    # 2. Chapter pages 1 to 82
    for p_num in range(1, 83):
        content = None
        if p_num in CH1_3_PAGES:
            content = CH1_3_PAGES[p_num]
        elif p_num in CH4_PAGES:
            content = CH4_PAGES[p_num]
        elif p_num in CH5_PAGES:
            content = CH5_PAGES[p_num]
        elif p_num in CH6_PAGES:
            content = CH6_PAGES[p_num]
        elif p_num in CH7_PAGES:
            content = CH7_PAGES[p_num]
        elif p_num in CH8_APP_PAGES:
            content = CH8_APP_PAGES[p_num]
        else:
            raise KeyError(f"Missing chapter page number: {p_num}")
            
        report_parts.append(content.strip())
        if p_num < 82:
            report_parts.append("\n\n" + "\x0c" + "\n\n") # Form feed for page break
            
    full_text = "".join(report_parts)
    
    # Target files
    root_file = os.path.join(os.path.dirname(cur_dir), "FINAL_ENGINEERING_REPORT_80_PAGES.txt")
    fyp_dir = os.path.join(os.path.dirname(cur_dir), "docs", "fyp")
    os.makedirs(fyp_dir, exist_ok=True)
    fyp_file = os.path.join(fyp_dir, "FINAL_ENGINEERING_REPORT_80_PAGES.txt")
    
    with open(root_file, "w", encoding="utf-8") as f:
        f.write(full_text)
        
    with open(fyp_file, "w", encoding="utf-8") as f:
        f.write(full_text)
        
    print(f"Master report successfully written to:")
    print(f"  -> {root_file} ({len(full_text):,} bytes)")
    print(f"  -> {fyp_file} ({len(full_text):,} bytes)")
    
    # Word count and page stats
    words = len(full_text.split())
    lines = len(full_text.splitlines())
    print(f"Total Words: {words:,}")
    print(f"Total Lines: {lines:,}")
    print(f"Total Pages Assembled: 10 Front Matter + 82 Chapter Pages = 92 Complete Pages.")

if __name__ == "__main__":
    compile_report()
