import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
// DEC-000: local UI mirror, no hosting project or deployment plugin.
export default defineConfig({css:{postcss:{plugins:[tailwindcss()]}},plugins:[vinext()]});
