export function isDev(): boolean {
    return process.env.NOde_ENV === "development"
}