/**
 * Author: bx
 * Date: 2025
 * Project: swagX-parser
 * Version: 1.0
 * Description: 解析器，用于解析 Swagger/OpenAPI 文档，这里使用swagger-parser 和 js-yaml 实现
 */

const fs = require('fs').promises;
const path = require('path');
const SwaggerParser = require('swagger-parser');
const yaml = require('js-yaml');

class SwaggerParserClass {
  constructor() {
    this.parser = new SwaggerParser();
  }

  /**
   * 解析 Swagger/OpenAPI 文档
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 解析结果
   */
  async parse(filePath) {
    try {
      // 检查文件是否存在
      await fs.access(filePath);
      
      const api = await this.parser.parse(filePath);
      const endpoints = this.extractEndpoints(api);
      
      return {
        info: api.info || {},
        servers: api.servers || [],
        endpoints: endpoints,
        security: api.security || [],
        components: api.components || {},
        raw: api
      };
    } catch (error) {
      throw new Error(`❌解析 Swagger 文档失败: ${error.message}`);
    }
  }

  /**
   * 提取所有端点信息
   * @param {Object} api - 解析后的 API 对象
   * @returns {Array} 端点列表
   */
  extractEndpoints(api) {
    const endpoints = [];
    
    if (!api.paths) {
      return endpoints;
    }

    for (const [path, pathItem] of Object.entries(api.paths)) {
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
      
      for (const method of methods) {
        if (pathItem[method]) {
          const operation = pathItem[method];
          
          const endpoint = {
            path: path,
            method: method.toUpperCase(),
            operationId: operation.operationId || `${method.toUpperCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
            summary: operation.summary || '',
            description: operation.description || '',
            tags: operation.tags || [],
            parameters: this.extractParameters(operation.parameters || []),
            requestBody: this.extractRequestBody(operation.requestBody),
            responses: this.extractResponses(operation.responses),
            security: operation.security || [],
            deprecated: operation.deprecated || false
          };
          
          endpoints.push(endpoint);
        }
      }
    }
    
    return endpoints;
  }

  /**
   * 提取参数信息
   * @param {Array} parameters - 参数数组
   * @returns {Array} 处理后的参数
   */
  extractParameters(parameters) {
    return parameters.map(param => ({
      name: param.name,
      in: param.in, // path, query, header, cookie
      required: param.required || false,
      description: param.description || '',
      schema: param.schema || {},
      example: param.example,
      deprecated: param.deprecated || false
    }));
  }

  /**
   * 提取请求体信息
   * @param {Object} requestBody - 请求体对象
   * @returns {Object|null} 处理后的请求体
   */
  extractRequestBody(requestBody) {
    if (!requestBody) return null;
    
    return {
      required: requestBody.required || false,
      description: requestBody.description || '',
      content: requestBody.content || {}
    };
  }

  /**
   * 提取响应信息
   * @param {Object} responses - 响应对象
   * @returns {Object} 处理后的响应
   */
  extractResponses(responses) {
    const result = {};
    
    for (const [code, response] of Object.entries(responses)) {
      result[code] = {
        description: response.description || '',
        content: response.content || {},
        headers: response.headers || {}
      };
    }
    
    return result;
  }


  /**
   * 将数据转换为 CSV 格式，用于下面saveToFile方法的csv格式输出
   * @param {Array} data - 数据数组
   * @returns {string} CSV 内容
   */
  convertToCsv(data) {
    if (!data || !data.length) return '';
    const headers = Object.keys(data[0]);
    const csvContent = [headers.join(',')];
    data.forEach(item => {
      csvContent.push(headers.map(header => item[header]).join(','));
    });
    return csvContent.join('\n');
  }

  /**
   * 保存解析结果到文件
   * @param {Object} data - 解析数据
   * @param {string} outputPath - 输出路径
   * @param {string} format - 输出格式，这里默认是json，支持yaml、txt、csv
   */
  async saveToFile(data, outputPath, format = 'json') {
    try {
      let content;
      
      switch (format.toLowerCase()) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          break;
        case 'yaml':
          content = yaml.dump(data);
          break;
        case 'txt':
          content = JSON.stringify(data, null, 2);
          break;
        case 'csv':
          content = this.convertToCsv(data);
          break;
        default:
          throw new Error(`❌不支持的输出格式: ${format}`);
      }
      
      await fs.writeFile(outputPath, content, 'utf8');
    } catch (error) {
      throw new Error(`❌保存文件失败: ${error.message}`);
    }
  }

  /**
   * 验证 Swagger 文档
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 是否有效
   */
  async validate(filePath) {
    try {
      await this.parser.parse(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = SwaggerParserClass; 