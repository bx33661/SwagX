#!/usr/bin/env node

/**
 * Author: bx
 * Date: 2025
 * Project: swagX
 * Description: Swagger API 安全测试工具, 基于swagger-parser 和 axios 实现
 * Version: 0.1
 */

const { Command } = require('commander');
const chalk = require('chalk');
const SwaggerParser = require('./parser/swaggerParser');
const SecurityTester = require('./tester/securityTester');
const Reporter = require('./reporter/reporter');

const program = new Command();

/**
 * 命令行参数解析
 * parse 命令: 解析 Swagger/OpenAPI 文档
 * test 命令: 执行安全测试
 * scan 命令: 完整扫描 (解析 + 测试)
 * 
 */
program
// 主命令
  .name('swagX')
  .description('Swagger API 安全测试工具, 基于swagger-parser 和 axios 实现')
  .version('0.1');

// 子命令: parse
program
  .command('parse')
  .description('解析 Swagger/OpenAPI 文档')
  .argument('<file>', 'Swagger 文件路径 (swagger.json 或 openapi.yaml)')
  .option('-o, --output <file>', '输出文件路径')
  .option('-f, --format <format>', '输出格式 (json, yaml, table)', 'table')
  .action(async (file, options) => {
    try {
      console.log(chalk.blue('🔍 正在解析 Swagger 文档...'));
      
      const parser = new SwaggerParser();
      const result = await parser.parse(file);
      
      if (options.output) {
        await parser.saveToFile(result, options.output, options.format);
        console.log(chalk.green(`✅ 结果已保存到: ${options.output}`));
      } else {
        const reporter = new Reporter();
        reporter.printEndpoints(result);
      }
    } catch (error) {
      console.error(chalk.red(`❌ 解析失败: ${error.message}`));
      process.exit(1);
    }
  });

// 子命令: test
program
  .command('test')
  .description('执行安全测试')
  .argument('<file>', 'Swagger 文件路径')
  .option('-b, --base-url <url>', 'API 基础 URL')
  .option('-t, --timeout <ms>', '请求超时时间 (毫秒)', '5000')
  .option('-r, --report <file>', '测试报告输出文件')
  .option('--no-ssl-verify', '禁用 SSL 验证')
  .action(async (file, options) => {
    try {
      console.log(chalk.blue('🔍 正在解析 Swagger 文档...'));
      
      const parser = new SwaggerParser();
      const swaggerData = await parser.parse(file);
      
      console.log(chalk.blue('🚀 开始安全测试...'));
      
      const tester = new SecurityTester({
        baseUrl: options.baseUrl,
        timeout: parseInt(options.timeout),
        sslVerify: options.sslVerify
      });
      
      const results = await tester.runTests(swaggerData);
      
      const reporter = new Reporter();
      if (options.report) {
        await reporter.saveReport(results, options.report);
        console.log(chalk.green(`✅ 测试报告已保存到: ${options.report}`));
      } else {
        reporter.printTestResults(results);
      }
    } catch (error) {
      console.error(chalk.red(`❌ 测试失败: ${error.message}`));
      process.exit(1);
    }
  });

// 子命令: scan
program
  .command('scan')
  .description('完整扫描 (解析 + 测试)')
  .argument('<file>', 'Swagger 文件路径')
  .option('-b, --base-url <url>', 'API 基础 URL')
  .option('-o, --output <dir>', '输出目录')
  .option('-r, --report <file>', '报告文件名', 'swagX-report.json')
  .action(async (file, options) => {
    try {
      console.log(chalk.blue('🔍 开始完整扫描...'));
      
      const parser = new SwaggerParser();
      const swaggerData = await parser.parse(file);
      
      console.log(chalk.green(`✅ 解析完成，发现 ${swaggerData.endpoints.length} 个端点`));
      
      if (options.baseUrl) {
        console.log(chalk.blue('🚀 开始安全测试...'));
        
        const tester = new SecurityTester({
          baseUrl: options.baseUrl,
          timeout: 5000,
          sslVerify: true
        });
        
        const results = await tester.runTests(swaggerData);
        
        const reporter = new Reporter();
        const reportPath = options.output ? `${options.output}/${options.report}` : options.report;
        await reporter.saveReport(results, reportPath);
        
        console.log(chalk.green(`✅ 扫描完成，报告已保存到: ${reportPath}`));
      } else {
        console.log(chalk.yellow('⚠️  未提供基础 URL，跳过安全测试'));
        console.log(chalk.blue('💡 使用 --base-url 参数来执行安全测试'));
      }
    } catch (error) {
      console.error(chalk.red(`❌ 扫描失败: ${error.message}`));
      process.exit(1);
    }
  });

// 解析命令行参数
program.parse(); 