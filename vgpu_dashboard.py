import tkinter as tk
from tkinter import ttk
import requests
import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import time
import sys
import random

# Color Palette (Databricks/Catppuccin inspired)
BG_DARK = "#0b1117"
BG_CARD = "#161b22"
ACCENT = "#58a6ff"
ACCENT_MUTED = "#1f6feb"
TEXT_PRIMARY = "#c9d1d9"
TEXT_SECONDARY = "#8b949e"
BORDER = "#30363d"
GREEN = "#3fb950"
ORANGE = "#d29922"
RED = "#f85149"

class VGPUTickerDashboard:
    def __init__(self, root):
        self.root = root
        self.root.title("OpenVGPU Professional Monitor")
        self.root.geometry("1100x750")
        self.root.configure(bg=BG_DARK)

        # Style Configuration
        self.setup_styles()

        # Data Streams
        self.history_len = 50
        self.compute_history = [0.0] * self.history_len
        self.memory_history = [0.0] * self.history_len
        
        self.accuracy_val = "0.0%"
        self.speed_val = "0.0"
        self.dataset_val = "None"
        self.temp_val = "40°C"
        self.power_val = "50W"
        self.status_text = "INITIALIZING..."
        self.status_color = ORANGE

        self.setup_ui()
        
        self.running = True
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        self.update_loop()

    def on_closing(self):
        print("🔌 Dashboard shutting down...")
        self.running = False
        try:
            plt.close(self.fig)
            self.root.destroy()
        except:
            pass
        sys.exit(0)

    def setup_styles(self):
        self.style = ttk.Style()
        self.style.theme_use("clam")
        self.style.configure("TLabel", foreground=TEXT_PRIMARY, background=BG_DARK, font=("Segoe UI", 10))
        self.style.configure("Card.TFrame", background=BG_CARD)
        self.style.configure("Header.TLabel", font=("Segoe UI", 16, "bold"), foreground=TEXT_PRIMARY)
        self.style.configure("StatValue.TLabel", font=("Consolas", 22, "bold"), foreground=ACCENT)
        self.style.configure("StatLabel.TLabel", font=("Segoe UI", 8, "bold"), foreground=TEXT_SECONDARY)

    def setup_ui(self):
        # Top Header Bar
        header_frame = tk.Frame(self.root, bg=BG_DARK, height=60)
        header_frame.pack(fill="x", padx=30, pady=(20, 10))
        
        title_label = tk.Label(header_frame, text="VGPU TELEMETRY", bg=BG_DARK, fg=TEXT_PRIMARY, font=("Segoe UI", 14, "bold"))
        title_label.pack(side="left")
        
        self.status_indicator = tk.Label(header_frame, text=self.status_text, bg=BG_DARK, fg=self.status_color, font=("Segoe UI", 9, "bold"))
        self.status_indicator.pack(side="right")

        # Top Stats Row
        stats_outer = tk.Frame(self.root, bg=BG_DARK)
        stats_outer.pack(fill="x", padx=30, pady=10)
        
        self.cards = {
            "compute": self.create_stat_card(stats_outer, "COMPUTE LOAD", "0.0%", 0),
            "vram": self.create_stat_card(stats_outer, "VRAM USAGE", "0 MB", 1),
            "temp": self.create_stat_card(stats_outer, "TEMPERATURE", "40°C", 2),
            "power": self.create_stat_card(stats_outer, "POWER DRAW", "50W", 3)
        }

        # Main Content (Graphs)
        main_frame = tk.Frame(self.root, bg=BG_DARK)
        main_frame.pack(fill="both", expand=True, padx=30, pady=10)
        
        # Left Panel (Graphs + Leaderboard)
        graph_panel = tk.Frame(main_frame, bg=BG_DARK)
        graph_panel.pack(side="left", fill="both", expand=True, padx=(0, 10))
        
        self.setup_graphs(graph_panel)
        self.setup_leaderboard(graph_panel)

        # Right Panel (Job Context)
        job_panel = tk.Frame(main_frame, bg=BG_CARD, width=280, highlightbackground=BORDER, highlightthickness=1)
        job_panel.pack(side="right", fill="y", pady=10)
        job_panel.pack_propagate(False)
        
        self.setup_job_panel(job_panel)

    def setup_leaderboard(self, parent):
        tk.Label(parent, text="MODEL PERFORMANCE INDEX (LEADERBOARD)", bg=BG_DARK, fg=TEXT_PRIMARY, font=("Segoe UI", 9, "bold")).pack(anchor="w", pady=(10, 5))
        
        # Style for Treeview
        self.style.configure("Treeview", background=BG_CARD, foreground=TEXT_PRIMARY, fieldbackground=BG_CARD, borderwidth=0, font=("Segoe UI", 8))
        self.style.configure("Treeview.Heading", background=BG_DARK, foreground=TEXT_PRIMARY, borderwidth=0, font=("Segoe UI", 8, "bold"))
        self.style.map("Treeview", background=[('selected', ACCENT_MUTED)])

        container = tk.Frame(parent, bg=BG_DARK)
        container.pack(fill="both", expand=True)

        cols = ("Model", "InfTime", "RMSE", "MAE", "R2")
        self.tree = ttk.Treeview(container, columns=cols, show='headings', height=10)
        
        for col in cols:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=80, anchor="center")
        
        self.tree.pack(side="left", fill="both", expand=True)
        
        scrollbar = ttk.Scrollbar(container, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side="right", fill="y")

    def update_leaderboard(self, leaderboard_data):
        # Clear existing
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        # Add new
        for entry in leaderboard_data:
            self.tree.insert("", "end", values=(
                entry["name"],
                entry["inf_time"],
                entry["rmse"],
                entry["mae"],
                entry["r2"]
            ))

    def create_stat_card(self, parent, label, value, col):
        frame = tk.Frame(parent, bg=BG_CARD, highlightbackground=BORDER, highlightthickness=1, padx=20, pady=15)
        frame.grid(row=0, column=col, padx=5, sticky="nsew")
        parent.grid_columnconfigure(col, weight=1)
        
        tk.Label(frame, text=label, bg=BG_CARD, fg=TEXT_SECONDARY, font=("Segoe UI", 8, "bold")).pack(anchor="w")
        val_label = tk.Label(frame, text=value, bg=BG_CARD, fg=ACCENT, font=("Consolas", 18, "bold"))
        val_label.pack(anchor="w", pady=(5, 0))
        
        return val_label

    def setup_job_panel(self, parent):
        self.job_monitor_title = tk.Label(parent, text="LIVE JOB MONITOR", bg=BG_CARD, fg=TEXT_PRIMARY, font=("Segoe UI", 10, "bold"))
        self.job_monitor_title.pack(pady=20)
        
        # Accuracy Gauge Section
        self.acc_circle_canvas = tk.Canvas(parent, width=150, height=150, bg=BG_CARD, highlightthickness=0)
        self.acc_circle_canvas.pack(pady=10)
        self.draw_gauge(0)
        
        self.acc_lbl_text = tk.Label(parent, text="LATEST ACCURACY", bg=BG_CARD, fg=TEXT_SECONDARY, font=("Segoe UI", 8))
        self.acc_lbl_text.pack()
        self.job_acc_label = tk.Label(parent, text="0.0%", bg=BG_CARD, fg=GREEN, font=("Consolas", 24, "bold"))
        self.job_acc_label.pack()

        # Job Details
        details_frame = tk.Frame(parent, bg=BG_CARD, padx=20, pady=20)
        details_frame.pack(fill="x")
        
        def add_detail(label_text, initial_val):
            lbl_type = tk.Label(details_frame, text=label_text, bg=BG_CARD, fg=TEXT_SECONDARY, font=("Segoe UI", 7, "bold"))
            lbl_type.pack(anchor="w")
            l = tk.Label(details_frame, text=initial_val, bg=BG_CARD, fg=TEXT_PRIMARY, font=("Segoe UI", 9), wraplength=200)
            l.pack(anchor="w", pady=(0, 10))
            return lbl_type, l

        self.speed_lbl_text, self.job_speed_l = add_detail("INFERENCE SPEED", "0.0 samples/sec")
        self.fleet_lbl_text, self.job_dataset_l = add_detail("ACTIVE DATASET", "None")
        
        # AutoML Intelligence Section
        tk.Label(parent, text="AUTOML INTELLIGENCE", bg=BG_CARD, fg=ACCENT, font=("Segoe UI", 7, "bold")).pack(anchor="w", padx=20, pady=(10, 5))
        self.automl_type_l = tk.Label(parent, text="Type: N/A", bg=BG_CARD, fg=TEXT_SECONDARY, font=("Segoe UI", 8))
        self.automl_type_l.pack(anchor="w", padx=20)
        self.automl_strat_l = tk.Label(parent, text="Strategy: N/A", bg=BG_CARD, fg=TEXT_SECONDARY, font=("Segoe UI", 8), wraplength=200, justify="left")
        self.automl_strat_l.pack(anchor="w", padx=20)
        self.automl_opt_l = tk.Label(parent, text="Opt: N/A", bg=BG_CARD, fg=TEXT_SECONDARY, font=("Segoe UI", 8), wraplength=200, justify="left")
        self.automl_opt_l.pack(anchor="w", padx=20)

    def draw_gauge(self, percent):
        self.acc_circle_canvas.delete("all")
        # Circle
        self.acc_circle_canvas.create_oval(10, 10, 140, 140, outline=BORDER, width=8)
        # Arc
        percent_val = float(percent) if percent is not None else 0.0
        extent = -(percent_val * 3.6)
        if percent_val > 0:
            self.acc_circle_canvas.create_arc(10, 10, 140, 140, start=90, extent=extent, outline=GREEN, width=8, style="arc")
        # Text
        percent_str = f"{int(percent_val)}%"
        self.acc_circle_canvas.create_text(75, 75, text=percent_str, fill=TEXT_PRIMARY, font=("Consolas", 20, "bold"))

    def setup_graphs(self, parent):
        self.fig, (self.ax1, self.ax2) = plt.subplots(2, 1, figsize=(6, 8), dpi=100)
        self.fig.patch.set_facecolor(BG_DARK)
        self.fig.subplots_adjust(hspace=0.4, top=0.95, bottom=0.05)

        for ax, title, color in [(self.ax1, "Compute Utilization (%)", ACCENT), (self.ax2, "VRAM Allocation (MB)", "#cba6f7")]:
            ax.set_facecolor(BG_DARK)
            ax.spines['bottom'].set_color(BORDER)
            ax.spines['left'].set_color(BORDER)
            ax.spines['right'].set_visible(False)
            ax.spines['top'].set_visible(False)
            ax.tick_params(axis='x', colors=TEXT_SECONDARY, labelsize=8)
            ax.tick_params(axis='y', colors=TEXT_SECONDARY, labelsize=8)
            ax.set_title(title, color=TEXT_PRIMARY, fontsize=10, pad=10, loc="left")

        self.line_compute, = self.ax1.plot(self.compute_history, color=ACCENT, linewidth=2)
        self.fill_compute = self.ax1.fill_between(range(self.history_len), self.compute_history, color=ACCENT, alpha=0.1)
        
        self.line_memory, = self.ax2.plot(self.memory_history, color="#cba6f7", linewidth=2)
        self.fill_memory = self.ax2.fill_between(range(self.history_len), self.memory_history, color="#cba6f7", alpha=0.1)

        self.canvas = FigureCanvasTkAgg(self.fig, master=parent)
        self.canvas.draw()
        self.canvas.get_tk_widget().pack(fill="both", expand=True, pady=10)

    def update_loop(self):
        if not self.running:
            return
            
        try:
            # 1. Fetch live GPU metrics
            resp = requests.get("http://localhost:8000/api/gpu/physical", timeout=0.8)
            metrics = resp.json()[0]
            
            util = metrics["gpu_utilization"]
            mem = metrics["memory_used"]
            
            self.compute_history.append(util)
            self.compute_history.pop(0)
            self.memory_history.append(mem)
            self.memory_history.pop(0)
            
            # Update Stat Cards
            self.cards["compute"].config(text=f"{util:.1f}%")
            self.cards["vram"].config(text=f"{int(mem)} MB")
            self.cards["temp"].config(text=f"{int(metrics['temperature'])}°C")
            self.cards["power"].config(text=f"{int(metrics['power_draw'])}W")

            # 2. Fetch job fleet for parallel monitoring
            resp_fleet = requests.get("http://localhost:8000/api/jobs/fleet", timeout=0.8)
            fleet = resp_fleet.json()
            
            if fleet:
                if len(fleet) > 1:
                    # --- PARALLEL CLUSTER MODE ---
                    avg_acc = sum(j['accuracy'] for j in fleet) / len(fleet)
                    total_speed = sum(j['speed'] for j in fleet)
                    
                    self.accuracy_val = f"{avg_acc:.1f}%"
                    self.speed_val = f"{total_speed:.1f} samples/sec"
                    self.dataset_val = f"{len(fleet)} Nodes Active"
                    
                    # Update Titles for Cluster Mode
                    self.job_monitor_title.config(text="CLUSTER FLEET MONITOR")
                    self.acc_lbl_text.config(text="CLUSTER AVG ACCURACY")
                    self.speed_lbl_text.config(text="TOTAL THROUGHPUT")
                    self.fleet_lbl_text.config(text="ACTIVE FLEET SIZE")
                    
                    self.draw_gauge(avg_acc)
                    summary = f"FLEET STATUS: {len(fleet)} ACTIVE NODES"
                else:
                    # --- SINGLE NODE AI MODE ---
                    job = fleet[0]
                    self.accuracy_val = f"{job['accuracy']}%"
                    self.speed_val = f"{job['speed']} samples/sec"
                    self.dataset_val = job.get('dataset_used', 'N/A')
                    
                    # Update Titles for Single Mode
                    self.job_monitor_title.config(text="SINGLE NODE AI MONITOR")
                    self.acc_lbl_text.config(text="MODEL ACCURACY")
                    self.speed_lbl_text.config(text="INFERENCE SPEED")
                    self.fleet_lbl_text.config(text="ACTIVE DATASET")
                    
                    self.draw_gauge(job['accuracy'])
                    summary = "ENVIRONMENT: SINGLE TASK MODE"

                self.job_acc_label.config(text=self.accuracy_val)
                self.job_speed_l.config(text=self.speed_val)
                self.job_dataset_l.config(text=self.dataset_val)
                self.status_indicator.config(text=summary)
                
                # --- LEADERBOARD UPDATE ---
                # Check for leaderboard in the most recent job
                if fleet[0].get("leaderboard"):
                    self.update_leaderboard(fleet[0]["leaderboard"])
                
                # --- AUTOML DIAGNOSTICS UPDATE ---
                automl_info = fleet[0].get("automl_info")
                if automl_info:
                    self.automl_type_l.config(text=f"Type: {automl_info.get('dataset_type', 'N/A')}")
                    self.automl_strat_l.config(text=f"Strategy: {automl_info.get('strategy', 'N/A')}")
                    self.automl_opt_l.config(text=f"Opt: {automl_info.get('optimization', 'N/A')}")
                else:
                    self.automl_type_l.config(text="Type: N/A")
                    self.automl_strat_l.config(text="Strategy: N/A")
                    self.automl_opt_l.config(text="Opt: N/A")
            else:
                self.draw_gauge(0)
                self.job_acc_label.config(text="0.0%")
                self.job_speed_l.config(text="0.0")
                self.job_dataset_l.config(text="None")
                self.job_monitor_title.config(text="SYSTEM IDLE")
                self.status_indicator.config(text="STATUS: READY")

            self.status_text = "CONNECTED"
            self.status_color = GREEN
        except Exception as e:
            self.status_text = "LOST SYNC"
            self.status_color = RED
        
        # Update UI Elements
        self.status_indicator.config(text=self.status_text, fg=self.status_color)
        
        # Update Plot History
        try:
            self.line_compute.set_ydata(self.compute_history)
            self.line_memory.set_ydata(self.memory_history)
            
            # Efficiently update fills
            self.ax1.collections.clear()
            self.ax1.fill_between(range(self.history_len), self.compute_history, color=ACCENT, alpha=0.1)
            
            self.ax2.collections.clear()
            self.ax2.fill_between(range(self.history_len), self.memory_history, color="#cba6f7", alpha=0.1)
            
            if self.running and self.root.winfo_exists():
                self.canvas.draw()
        except:
            pass
        
        # Reschedule safely
        if self.running:
            try:
                self.root.after(1000, self.update_loop)
            except:
                pass

def run_dashboard():
    try:
        root = tk.Tk()
        app = VGPUTickerDashboard(root)
        root.mainloop()
    except Exception as e:
        print(f"Dashboard Crash: {e}")

if __name__ == "__main__":
    run_dashboard()
