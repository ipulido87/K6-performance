# Performance Testing Runbook

## Quick Reference

### Daily Operations

```bash
# Morning health check
npm run test:smoke

# Before deployment
npm run test:quick

# After deployment
npm run test:smoke && npm run test:load
```

### Emergency Response

```bash
# Quick validation
npm run test:smoke

# Capacity check
npm run test:load:light

# Find breaking point
npm run test:stress
```

## Common Scenarios

### Scenario 1: New Deployment Validation

**Goal**: Verify service is working correctly after deployment

**Steps**:
1. Run smoke test
   ```bash
   npm run test:smoke:prod
   ```

2. If smoke passes, run light load test
   ```bash
   k6 run -e ENVIRONMENT=prod -e MAX_VUS=50 tests/load/soap-load.test.js
   ```

3. Monitor for 5 minutes

4. If successful, gradually increase load

**Success Criteria**:
- Smoke test: 100% success rate
- Load test: < 5% error rate
- Response times within SLA

### Scenario 2: Performance Degradation Investigation

**Goal**: Identify cause of performance issues

**Steps**:
1. Establish baseline
   ```bash
   npm run test:smoke
   ```

2. Test with different payload sizes
   ```bash
   k6 run -e SIZE_MB=1 tests/load/soap-load.test.js
   k6 run -e SIZE_MB=5 tests/load/soap-load.test.js
   k6 run -e SIZE_MB=10 tests/load/soap-load.test.js
   ```

3. Test with different load levels
   ```bash
   npm run test:load:light
   npm run test:load
   npm run test:load:heavy
   ```

4. Analyze error patterns and response times

**Things to Check**:
- Database performance
- Network latency
- Service resource usage (CPU, memory)
- Error logs
- Payload size correlation

### Scenario 3: Capacity Planning

**Goal**: Determine maximum sustainable capacity

**Steps**:
1. Baseline current capacity
   ```bash
   npm run test:load
   ```

2. Run stress test to find limits
   ```bash
   npm run test:stress
   ```

3. Analyze breaking point

4. Test recovery
   ```bash
   # After stress test, wait 5 minutes
   npm run test:smoke
   ```

5. Document findings

**Deliverables**:
- Maximum RPS before degradation
- Maximum concurrent users
- Resource utilization at peak
- Recommended capacity limits

### Scenario 4: Payload Size Limit Discovery

**Goal**: Find maximum acceptable payload size

**Steps**:
1. Run size test with default settings
   ```bash
   npm run test:size
   ```

2. If no limit found, extend range
   ```bash
   npm run test:size:large
   ```

3. Document breaking point

4. Test one level below breaking point under load
   ```bash
   k6 run -e SIZE_MB=<safe_size> -e MAX_VUS=100 tests/load/soap-load.test.js
   ```

**Deliverables**:
- Maximum payload size
- Error type at breaking point
- Recommended safe payload size (80% of max)

### Scenario 5: Load Testing Before Black Friday

**Goal**: Ensure system can handle expected traffic spike

**Steps**:
1. Estimate expected load (e.g., 5x normal)

2. Run progressive load tests
   ```bash
   # 2x normal
   k6 run -e MAX_VUS=400 tests/load/soap-load.test.js

   # 3x normal
   k6 run -e MAX_VUS=600 tests/load/soap-load.test.js

   # 5x normal
   k6 run -e MAX_VUS=1000 tests/load/soap-load.test.js
   ```

3. Run spike test
   ```bash
   k6 run -e SPIKE_VUS=1000 tests/spike/soap-spike.test.js
   ```

4. Run extended soak test
   ```bash
   npm run test:soak:long
   ```

5. Document results and recommendations

**Deliverables**:
- Load test results at each level
- Breaking point identification
- Infrastructure scaling recommendations
- Monitoring alert thresholds

## Troubleshooting

### High Error Rates

**Symptoms**: Error rate > threshold

**Investigation**:
1. Check error types in logs
   ```bash
   # Look for REJECTED_SEMAPHORE_EXECUTION
   # Look for SHORTCIRCUIT
   # Look for HTTP 500/503/504
   ```

2. Reduce load and retest
   ```bash
   k6 run -e MAX_VUS=50 tests/load/soap-load.test.js
   ```

3. Check service health
   - CPU usage
   - Memory usage
   - Database connections
   - Network connectivity

4. Review recent changes
   - Code deployments
   - Configuration changes
   - Infrastructure changes

**Solutions**:
- Scale up infrastructure
- Optimize application code
- Adjust rate limiting
- Increase timeouts (if appropriate)

### Slow Response Times

**Symptoms**: p95 or p99 above SLA

**Investigation**:
1. Run with minimal load
   ```bash
   npm run test:smoke
   ```

2. Check if issue is load-dependent
   ```bash
   k6 run -e MAX_VUS=10 tests/load/soap-load.test.js
   k6 run -e MAX_VUS=50 tests/load/soap-load.test.js
   k6 run -e MAX_VUS=100 tests/load/soap-load.test.js
   ```

3. Test with different payload sizes
   ```bash
   k6 run -e ACTIVITIES=1 tests/load/soap-load.test.js
   k6 run -e ACTIVITIES=5 tests/load/soap-load.test.js
   ```

4. Profile application

**Solutions**:
- Optimize database queries
- Add caching
- Scale horizontally
- Optimize payload processing

### Timeouts

**Symptoms**: HTTP status 0, timeout errors

**Investigation**:
1. Check network connectivity
2. Review timeout settings
3. Test with extended timeout
   ```bash
   # Modify config timeout temporarily
   ```

4. Check for long-running operations

**Solutions**:
- Optimize long operations
- Increase timeout (if justified)
- Implement async processing
- Add request queuing

### Memory Leaks (Soak Test)

**Symptoms**: Degrading performance over time

**Investigation**:
1. Run extended soak test
   ```bash
   npm run test:soak:long
   ```

2. Monitor memory usage over time
3. Profile application memory
4. Check for unclosed connections

**Solutions**:
- Fix memory leaks in code
- Implement proper resource cleanup
- Restart services periodically
- Add memory monitoring alerts

## Best Practices

### Before Running Tests

1. **Notify stakeholders** (for prod tests)
2. **Check service health** baseline
3. **Ensure monitoring is active**
4. **Backup recent data** (if needed)
5. **Have rollback plan ready**

### During Tests

1. **Monitor in real-time**
   - Service metrics
   - Error logs
   - Resource usage

2. **Be ready to stop**
   ```bash
   Ctrl+C to stop k6
   ```

3. **Watch for cascading failures**

4. **Document observations**

### After Tests

1. **Analyze results**
   - Compare to previous runs
   - Check against SLAs
   - Identify trends

2. **Generate reports**
   ```bash
   # Export results
   ```

3. **Update documentation**
   - Document findings
   - Update thresholds if needed
   - Note any issues

4. **Create action items**
   - Performance improvements
   - Infrastructure changes
   - Monitoring updates

## Scheduled Tests

### Daily
- Smoke test in dev/staging
- Light load test

### Weekly
- Full load test
- Stress test (off-peak)

### Monthly
- Comprehensive test suite
- Capacity planning review
- Soak test

### Quarterly
- End-to-end performance audit
- Threshold review
- Documentation update

## Escalation

### Level 1: Test Failure
- Retry test
- Check recent changes
- Review logs

### Level 2: Repeated Failures
- Notify development team
- Check infrastructure
- Review service dependencies

### Level 3: Production Impact
- Activate incident response
- Notify on-call team
- Scale infrastructure immediately
- Implement rate limiting

## Contacts

- Performance Team: [contact]
- DevOps Team: [contact]
- On-Call Engineer: [contact]

## Related Documentation

- [Architecture](architecture.md)
- [Test Strategy](test-strategy.md)
- [README](../README.md)
