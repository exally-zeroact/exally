Attribute VB_Name = "Module3"
Option Explicit

' –ˆŒF–¼‘O‚Å •À‚×‘Ö‚¦‚Ä Å‚Ì—ñ‚ğ ‘«‚·
Sub ŒŸ‚Ì•À‚×‘Ö‚¦()
    Range("A1:D100").Sort Key1:=Range("B2"), Order1:=xlDescending
    Range("E1").Value = "Å"
    Range("E2:E100").Formula = "=D2*1.1"
End Sub
