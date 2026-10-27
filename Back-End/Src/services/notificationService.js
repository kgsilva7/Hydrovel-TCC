const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

class NotificationService {
    constructor() {
        this.emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);

        if (this.emailConfigured) {
            this.emailTransporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.EMAIL_PORT, 10) || 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
        }

        // Twilio é opcional — não quebra se não configurado
        this.smsConfigured = !!(
            process.env.TWILIO_ACCOUNT_SID &&
            process.env.TWILIO_AUTH_TOKEN &&
            process.env.TWILIO_PHONE_NUMBER
        );
        this.twilioClient = null;
        if (this.smsConfigured) {
            try {
                const twilio = require('twilio');
                this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            } catch (err) {
                console.warn('⚠️ Twilio não pôde ser inicializado:', err.message);
                this.smsConfigured = false;
            }
        }
    }

    isConfigured() {
        return { email: this.emailConfigured, sms: this.smsConfigured };
    }

    async sendAlertNotifications(user, alert) {
        const messages = [];
        const settings = user.settings?.alert_notifications || { email: true, sms: false, push: true };

        if (settings.email && this.emailConfigured) {
            try {
                await this.sendEmailAlert(user.email, alert);
                messages.push('Email enviado');
            } catch (error) {
                console.error('Erro ao enviar email:', error.message);
                messages.push('Erro no email');
            }
        }

        if (settings.sms && user.phone && this.smsConfigured) {
            try {
                await this.sendSmsAlert(user.phone, alert);
                messages.push('SMS enviado');
            } catch (error) {
                console.error('Erro ao enviar SMS:', error.message);
                messages.push('Erro no SMS');
            }
        }

        return messages;
    }

    async sendEmailAlert(email, alert) {
        if (!this.emailConfigured) throw new Error('Email não configurado');

        const severityColors = {
            low: '#3498db',
            medium: '#f39c12',
            high: '#e67e22',
            critical: '#e74c3c'
        };

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `🚨 Alerta Hydrovel: ${alert.type} - ${alert.severity}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: ${severityColors[alert.severity] || '#333'}">⚠️ Alerta do Hydrovel</h2>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Tipo:</strong> ${this.formatAlertType(alert.type)}</p>
                        <p><strong>Severidade:</strong> ${alert.severity.toUpperCase()}</p>
                        <p><strong>Mensagem:</strong> ${alert.message}</p>
                        <p><strong>Data:</strong> ${new Date(alert.created_at).toLocaleString('pt-BR')}</p>
                        ${alert.sensor_data ? `
                            <p><strong>Dados do Sensor:</strong><br>
                            Tipo: ${alert.sensor_data.sensor_type}<br>
                            Valor: ${alert.sensor_data.value}<br>
                            Limite: ${alert.sensor_data.threshold || 'Não definido'}
                            </p>
                        ` : ''}
                    </div>
                    <div style="text-align: center; color: #666; font-size: 12px;">
                        <p>Este é um alerta automático do sistema Hydrovel.</p>
                        <p>Por favor, verifique seu sistema hidráulico.</p>
                    </div>
                </div>
            `
        };

        await this.emailTransporter.sendMail(mailOptions);
    }

    async sendSmsAlert(phone, alert) {
        if (!this.smsConfigured || !this.twilioClient) throw new Error('SMS não configurado');

        const message = `🚨 Hydrovel: ${alert.type.toUpperCase()} - ${alert.severity.toUpperCase()}\n${alert.message}\nData: ${new Date(alert.created_at).toLocaleString('pt-BR')}`;

        await this.twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });
    }

    formatAlertType(type) {
        const types = {
            leak: 'Vazamento',
            quality: 'Qualidade da Água',
            pressure: 'Pressão',
            flow: 'Fluxo',
            temperature: 'Temperatura'
        };
        return types[type] || type;
    }

    sendPushNotification(socket, alert) {
        if (socket) {
            socket.emit('alert', {
                id: alert._id,
                type: alert.type,
                severity: alert.severity,
                message: alert.message,
                created_at: alert.created_at,
                read: alert.read
            });
        }
    }

    async sendDailyReport(user, data) {
        if (!this.emailConfigured || !user.email) return;

        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: '📊 Relatório Diário - Hydrovel',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>📊 Relatório Diário do Hydrovel</h2>
                        <p>Olá ${user.name},</p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3>Resumo do Sistema</h3>
                            ${this.generateDailySummary(data)}
                        </div>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3>Alertas do Dia</h3>
                            ${this.generateDailyAlerts(data)}
                        </div>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3>Consumo de Água</h3>
                            <p>Total: ${data.consumption?.total || 0} L</p>
                            <p>Média: ${data.consumption?.average || 0} L/hora</p>
                            <p>Pico: ${data.consumption?.peak || 0} L/hora</p>
                        </div>
                    </div>
                `
            };
            await this.emailTransporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Erro ao enviar relatório diário:', error.message);
        }
    }

    generateDailySummary(data) {
        let html = '<ul>';
        (data.averages || []).forEach((avg) => {
            const labels = {
                flow: 'Fluxo',
                pressure: 'Pressão',
                ph: 'pH',
                turbidity: 'Turbidez',
                temperature: 'Temperatura'
            };
            const avgSafe = (v) => (typeof v === 'number' ? v.toFixed(2) : 'N/A');
            html += `<li>${labels[avg._id] || avg._id}: ${avgSafe(avg.average)} (min: ${avgSafe(avg.min)}, max: ${avgSafe(avg.max)})</li>`;
        });
        html += '</ul>';
        return html;
    }

    generateDailyAlerts(data) {
        if (!data.alerts || data.alerts.length === 0) {
            return '<p>✅ Nenhum alerta registrado hoje</p>';
        }
        let html = '<ul>';
        data.alerts.forEach((alert) => {
            html += `<li>${this.formatAlertType(alert.type)} - ${alert.severity}: ${alert.message}</li>`;
        });
        html += '</ul>';
        return html;
    }
}

module.exports = new NotificationService();
