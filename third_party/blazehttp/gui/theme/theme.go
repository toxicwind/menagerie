package theme

import (
	_ "embed"
	"image/color"

	"fyne.io/fyne/v2"
	fyTheme "fyne.io/fyne/v2/theme"
)

//go:embed fonts/LXGWWenKaiMono-Regular.ttf
var lxwkFont []byte

type BlazeHTTPTheme struct{}

var _ fyne.Theme = (*BlazeHTTPTheme)(nil)

func (theme *BlazeHTTPTheme) Color(n fyne.ThemeColorName, v fyne.ThemeVariant) color.Color {
	return fyTheme.DefaultTheme().Color(n, v)
}

func (theme *BlazeHTTPTheme) Font(_ fyne.TextStyle) fyne.Resource {
	return fyne.NewStaticResource("LXGWWenKaiMono-Light", lxwkFont)
}

func (theme *BlazeHTTPTheme) Icon(n fyne.ThemeIconName) fyne.Resource {
	return fyTheme.DefaultTheme().Icon(n)
}

func (theme *BlazeHTTPTheme) Size(n fyne.ThemeSizeName) float32 {
	return fyTheme.DefaultTheme().Size(n)
}

func (theme *BlazeHTTPTheme) InnerPadding() float32 {
	return 0
}
