import { TextEncoder, TextDecoder } from 'util';

const Ye = {
  2: 'need dictionary',
  1: 'stream end',
  0: '',
  '-1': 'file error',
  '-2': 'stream error',
  '-3': 'data error',
  '-4': 'insufficient memory',
  '-5': 'buffer error',
  '-6': 'incompatible version',
};
const Xe = {
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,
  Z_BINARY: 0,
  Z_TEXT: 1,
  Z_UNKNOWN: 2,
  Z_DEFLATED: 8,
};
export function inflate(e, t?: any) {
  const r = new Inflater(t);
  if ((r.push(e), r.err)) {
    throw r.msg || Ye[r.err];
  }
  return r.result;
}

class Inflater {
  options: any;

  err = 0;

  msg = '';

  ended = false;

  chunks: any[] = [];

  strm: DataStream;

  header: Xr;

  result: any;

  constructor(options: any = {}) {
    this.options = {
      chunkSize: 65536,
      windowBits: 15,
      to: '',
      ...options,
    };

    const t = this.options;

    t.raw &&
      t.windowBits >= 0 &&
      t.windowBits < 16 &&
      ((t.windowBits = -t.windowBits), 0 === t.windowBits && (t.windowBits = -15));

    !(t.windowBits >= 0 && t.windowBits < 16) || (options && options.windowBits) || (t.windowBits += 32);
    t.windowBits > 15 && t.windowBits < 48 && 0 === (15 & t.windowBits) && (t.windowBits |= 15);

    this.err = 0;
    this.msg = '';
    this.ended = false;
    this.chunks = [];
    this.strm = new DataStream();
    this.strm.avail_out = 0;

    let r = Qr(this.strm, t.windowBits);
    if (r !== Xe.Z_OK) throw new Error(Ye[r]);

    this.header = new Xr(); // Assuming `Xr` is some sort of header object or class
    Zr(this.strm, this.header);

    if (t.dictionary) {
      if ('string' === typeof t.dictionary) {
        t.dictionary = Xt(t.dictionary); // Assuming `Xt` is a function defined elsewhere
      } else if ('[object ArrayBuffer]' === en.call(t.dictionary)) {
        t.dictionary = new Uint8Array(t.dictionary);
      }

      if (t.raw && (r = Yr(this.strm, t.dictionary)) !== Xe.Z_OK) {
        throw new Error(Ye[r]);
      }
    }
  }

  push(e, t?: any) {
    var r,
      n,
      o,
      i = this.strm,
      a = this.options.chunkSize,
      s = this.options.dictionary;
    if (this.ended) return !1;
    for (
      n = t === ~~t ? t : !0 === t ? Xe.Z_FINISH : Xe.Z_NO_FLUSH,
        '[object ArrayBuffer]' === en.call(e) ? (i.input = new Uint8Array(e)) : (i.input = e),
        i.next_in = 0,
        i.avail_in = i.input?.length ?? 0;
      ;

    ) {
      for (
        0 === i.avail_out && ((i.output = new Uint8Array(a)), (i.next_out = 0), (i.avail_out = a)),
          (r = Kr(i, n)) === Xe.Z_NEED_DICT &&
            s &&
            ((r = Yr(i, s)) === Xe.Z_OK ? (r = Kr(i, n)) : r === Xe.Z_DATA_ERROR && (r = Xe.Z_NEED_DICT));
        i.avail_in > 0 && r === Xe.Z_STREAM_END && i.state.wrap > 0 && 0 !== e[i.next_in];

      )
        Fr(i), (r = Kr(i, n));
      switch (r) {
        case Xe.Z_STREAM_ERROR:
        case Xe.Z_DATA_ERROR:
        case Xe.Z_NEED_DICT:
        case Xe.Z_MEM_ERROR:
          return this.onEnd(r), (this.ended = !0), !1;
      }
      if (((o = i.avail_out), i.next_out && (0 === i.avail_out || r === Xe.Z_STREAM_END)))
        if ('string' === this.options.to) {
          var u = tr(i.output, i.next_out),
            c = i.next_out - u,
            l = er(i.output, u);
          (i.next_out = c), (i.avail_out = a - c), c && i.output.set(i.output.subarray(u, u + c), 0), this.onData(l);
        } else this.onData(i.output.length === i.next_out ? i.output : i.output.subarray(0, i.next_out));
      if (r !== Xe.Z_OK || 0 !== o) {
        if (r === Xe.Z_STREAM_END) return (r = Jr(this.strm)), this.onEnd(r), (this.ended = !0), !0;
        if (0 === i.avail_in) break;
      }
    }
    return !0;
  }

  onData(e) {
    this.chunks.push(e);
  }

  onEnd(e) {
    e === Xe.Z_OK &&
      ('string' === this.options.to ? (this.result = this.chunks.join('')) : (this.result = Kt(this.chunks))),
      (this.chunks = []),
      (this.err = e),
      (this.msg = this.strm.msg);
  }
}

class DataStream {
  input: any = null;
  next_in = 0;
  avail_in = 0;
  total_in = 0;
  output: any = null;
  next_out = 0;
  avail_out = 0;
  total_out = 0;
  msg = '';
  state: any = null;
  data_type = 2;
  adler = 0;
}

class Xr {
  text = 0;
  time = 0;
  xflags = 0;
  os = 0;
  extra = null;
  extra_len = 0;
  name = '';
  comment = '';
  hcrc = 0;
  done = !1;
}

const Kt = function (e) {
  for (var t = 0, r = 0, n = e.length; r < n; r++) t += e[r].length;
  for (var o = new Uint8Array(t), i = 0, a = 0, s = e.length; i < s; i++) {
    var u = e[i];
    o.set(u, a), (a += u.length);
  }
  return o;
};

function Qr(e, t) {
  if (!e) return Xe.Z_STREAM_ERROR;
  var r = new Dr();
  (e.state = r), (r.window = null);
  var n = Hr(e, t);
  return n !== Xe.Z_OK && (e.state = null), n;
}

const Zr = function (e, t) {
  if (!e || !e.state) return Xe.Z_STREAM_ERROR;
  var r = e.state;
  return 0 == (2 & r.wrap) ? Xe.Z_STREAM_ERROR : ((r.head = t), (t.done = !1), Xe.Z_OK);
};

class Dr {
  mode = 0;
  last = !1;
  wrap = 0;
  havedict = !1;
  flags = 0;
  dmax = 0;
  check = 0;
  total = 0;
  head = null;
  wbits = 0;
  wsize = 0;
  whave = 0;
  wnext = 0;
  window = null;
  hold = 0;
  bits = 0;
  length = 0;
  offset = 0;
  extra = 0;
  lencode = null;
  distcode = null;
  lenbits = 0;
  distbits = 0;
  ncode = 0;
  nlen = 0;
  ndist = 0;
  have = 0;
  next = null;
  lens = new Uint16Array(320);
  work = new Uint16Array(288);
  lendyn = null;
  distdyn = null;
  sane = 0;
  back = 0;
  was = 0;
}

const Hr = function (e, t) {
  var r;
  if (!e || !e.state) return Xe.Z_STREAM_ERROR;
  var n = e.state;
  return (
    t < 0 ? ((r = 0), (t = -t)) : ((r = 1 + (t >> 4)), t < 48 && (t &= 15)),
    t && (t < 8 || t > 15)
      ? Xe.Z_STREAM_ERROR
      : (null !== n.window && n.wbits !== t && (n.window = null), (n.wrap = r), (n.wbits = t), Fr(e))
  );
};

const Fr = function (e) {
  if (!e || !e.state) return Xe.Z_STREAM_ERROR;
  var t = e.state;
  return (t.wsize = 0), (t.whave = 0), (t.wnext = 0), Vr(e);
};

var Rr,
  Nr,
  Vr = function (e) {
    if (!e || !e.state) return Xe.Z_STREAM_ERROR;
    var t = e.state;
    return (
      (e.total_in = e.total_out = t.total = 0),
      (e.msg = ''),
      t.wrap && (e.adler = 1 & t.wrap),
      (t.mode = 1),
      (t.last = 0),
      (t.havedict = 0),
      (t.dmax = 32768),
      (t.head = null),
      (t.hold = 0),
      (t.bits = 0),
      (t.lencode = t.lendyn = new Int32Array(852)),
      (t.distcode = t.distdyn = new Int32Array(592)),
      (t.sane = 1),
      (t.back = -1),
      Xe.Z_OK
    );
  };

const Xt = function (e) {
  return new TextEncoder().encode(e);
};

const en = Object.prototype.toString;

const Yr = function (e, t) {
  var r,
    n = t.length;
  return e && e.state
    ? 0 !== (r = e.state).wrap && 11 !== r.mode
      ? Xe.Z_STREAM_ERROR
      : 11 === r.mode && Ke(1, t, n, 0) !== r.check
      ? Xe.Z_DATA_ERROR
      : Gr(e, t, n, n)
      ? ((r.mode = 31), Xe.Z_MEM_ERROR)
      : ((r.havedict = 1), Xe.Z_OK)
    : Xe.Z_STREAM_ERROR;
};

const Ke = function (e, t, r, n) {
  for (var o = (65535 & e) | 0, i = ((e >>> 16) & 65535) | 0, a = 0; 0 !== r; ) {
    r -= a = r > 2e3 ? 2e3 : r;
    do {
      i = (i + (o = (o + t[n++]) | 0)) | 0;
    } while (--a);
    (o %= 65521), (i %= 65521);
  }
  return o | (i << 16) | 0;
};

const Gr = function (e, t, r, n) {
  var o,
    i = e.state;
  return (
    null === i.window && ((i.wsize = 1 << i.wbits), (i.wnext = 0), (i.whave = 0), (i.window = new Uint8Array(i.wsize))),
    n >= i.wsize
      ? (i.window.set(t.subarray(r - i.wsize, r), 0), (i.wnext = 0), (i.whave = i.wsize))
      : ((o = i.wsize - i.wnext) > n && (o = n),
        i.window.set(t.subarray(r - n, r - n + o), i.wnext),
        (n -= o)
          ? (i.window.set(t.subarray(r - n, r), 0), (i.wnext = n), (i.whave = i.wsize))
          : ((i.wnext += o), i.wnext === i.wsize && (i.wnext = 0), i.whave < i.wsize && (i.whave += o))),
    0
  );
};

const Kr = function (e, t) {
  var r,
    n,
    o,
    i,
    a,
    s,
    u,
    c,
    l,
    f,
    d,
    p,
    h,
    g,
    v,
    y,
    m,
    b,
    _,
    w,
    P,
    A,
    S,
    k,
    O = 0,
    E = new Uint8Array(4),
    x = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  if (!e || !e.state || !e.output || (!e.input && 0 !== e.avail_in)) return Xe.Z_STREAM_ERROR;
  12 === (r = e.state).mode && (r.mode = 13),
    (a = e.next_out),
    (o = e.output),
    (u = e.avail_out),
    (i = e.next_in),
    (n = e.input),
    (s = e.avail_in),
    (c = r.hold),
    (l = r.bits),
    (f = s),
    (d = u),
    (A = Xe.Z_OK);
  e: for (;;)
    switch (r.mode) {
      case 1:
        if (0 === r.wrap) {
          r.mode = 13;
          break;
        }
        for (; l < 16; ) {
          if (0 === s) break e;
          s--, (c += n[i++] << l), (l += 8);
        }
        if (2 & r.wrap && 35615 === c) {
          (r.check = 0),
            (E[0] = 255 & c),
            (E[1] = (c >>> 8) & 255),
            (r.check = Ze(r.check, E, 2, 0)),
            (c = 0),
            (l = 0),
            (r.mode = 2);
          break;
        }
        if (((r.flags = 0), r.head && (r.head.done = !1), !(1 & r.wrap) || (((255 & c) << 8) + (c >> 8)) % 31)) {
          (e.msg = 'incorrect header check'), (r.mode = 30);
          break;
        }
        if ((15 & c) !== Xe.Z_DEFLATED) {
          (e.msg = 'unknown compression method'), (r.mode = 30);
          break;
        }
        if (((l -= 4), (P = 8 + (15 & (c >>>= 4))), 0 === r.wbits)) r.wbits = P;
        else if (P > r.wbits) {
          (e.msg = 'invalid window size'), (r.mode = 30);
          break;
        }
        (r.dmax = 1 << r.wbits), (e.adler = r.check = 1), (r.mode = 512 & c ? 10 : 12), (c = 0), (l = 0);
        break;
      case 2:
        for (; l < 16; ) {
          if (0 === s) break e;
          s--, (c += n[i++] << l), (l += 8);
        }
        if (((r.flags = c), (255 & r.flags) !== Xe.Z_DEFLATED)) {
          (e.msg = 'unknown compression method'), (r.mode = 30);
          break;
        }
        if (57344 & r.flags) {
          (e.msg = 'unknown header flags set'), (r.mode = 30);
          break;
        }
        r.head && (r.head.text = (c >> 8) & 1),
          512 & r.flags && ((E[0] = 255 & c), (E[1] = (c >>> 8) & 255), (r.check = Ze(r.check, E, 2, 0))),
          (c = 0),
          (l = 0),
          (r.mode = 3);
      case 3:
        for (; l < 32; ) {
          if (0 === s) break e;
          s--, (c += n[i++] << l), (l += 8);
        }
        r.head && (r.head.time = c),
          512 & r.flags &&
            ((E[0] = 255 & c),
            (E[1] = (c >>> 8) & 255),
            (E[2] = (c >>> 16) & 255),
            (E[3] = (c >>> 24) & 255),
            (r.check = Ze(r.check, E, 4, 0))),
          (c = 0),
          (l = 0),
          (r.mode = 4);
      case 4:
        for (; l < 16; ) {
          if (0 === s) break e;
          s--, (c += n[i++] << l), (l += 8);
        }
        r.head && ((r.head.xflags = 255 & c), (r.head.os = c >> 8)),
          512 & r.flags && ((E[0] = 255 & c), (E[1] = (c >>> 8) & 255), (r.check = Ze(r.check, E, 2, 0))),
          (c = 0),
          (l = 0),
          (r.mode = 5);
      case 5:
        if (1024 & r.flags) {
          for (; l < 16; ) {
            if (0 === s) break e;
            s--, (c += n[i++] << l), (l += 8);
          }
          (r.length = c),
            r.head && (r.head.extra_len = c),
            512 & r.flags && ((E[0] = 255 & c), (E[1] = (c >>> 8) & 255), (r.check = Ze(r.check, E, 2, 0))),
            (c = 0),
            (l = 0);
        } else r.head && (r.head.extra = null);
        r.mode = 6;
      case 6:
        if (
          1024 & r.flags &&
          ((p = r.length) > s && (p = s),
          p &&
            (r.head &&
              ((P = r.head.extra_len - r.length),
              r.head.extra || (r.head.extra = new Uint8Array(r.head.extra_len)),
              r.head.extra.set(n.subarray(i, i + p), P)),
            512 & r.flags && (r.check = Ze(r.check, n, p, i)),
            (s -= p),
            (i += p),
            (r.length -= p)),
          r.length)
        )
          break e;
        (r.length = 0), (r.mode = 7);
      case 7:
        if (2048 & r.flags) {
          if (0 === s) break e;
          p = 0;
          do {
            (P = n[i + p++]), r.head && P && r.length < 65536 && (r.head.name += String.fromCharCode(P));
          } while (P && p < s);
          if ((512 & r.flags && (r.check = Ze(r.check, n, p, i)), (s -= p), (i += p), P)) break e;
        } else r.head && (r.head.name = null);
        (r.length = 0), (r.mode = 8);
      case 8:
        if (4096 & r.flags) {
          if (0 === s) break e;
          p = 0;
          do {
            (P = n[i + p++]), r.head && P && r.length < 65536 && (r.head.comment += String.fromCharCode(P));
          } while (P && p < s);
          if ((512 & r.flags && (r.check = Ze(r.check, n, p, i)), (s -= p), (i += p), P)) break e;
        } else r.head && (r.head.comment = null);
        r.mode = 9;
      case 9:
        if (512 & r.flags) {
          for (; l < 16; ) {
            if (0 === s) break e;
            s--, (c += n[i++] << l), (l += 8);
          }
          if (c !== (65535 & r.check)) {
            (e.msg = 'header crc mismatch'), (r.mode = 30);
            break;
          }
          (c = 0), (l = 0);
        }
        r.head && ((r.head.hcrc = (r.flags >> 9) & 1), (r.head.done = !0)), (e.adler = r.check = 0), (r.mode = 12);
        break;
      case 10:
        for (; l < 32; ) {
          if (0 === s) break e;
          s--, (c += n[i++] << l), (l += 8);
        }
        (e.adler = r.check = Ur(c)), (c = 0), (l = 0), (r.mode = 11);
      case 11:
        if (0 === r.havedict)
          return (
            (e.next_out = a),
            (e.avail_out = u),
            (e.next_in = i),
            (e.avail_in = s),
            (r.hold = c),
            (r.bits = l),
            Xe.Z_NEED_DICT
          );
        (e.adler = r.check = 1), (r.mode = 12);
      case 12:
        if (t === Xe.Z_BLOCK || t === Xe.Z_TREES) break e;
      case 13:
        if (r.last) {
          (c >>>= 7 & l), (l -= 7 & l), (r.mode = 27);
          break;
        }
        for (; l < 3; ) {
          if (0 === s) break e;
          s--, (c += n[i++] << l), (l += 8);
        }
        switch (((r.last = 1 & c), (l -= 1), 3 & (c >>>= 1))) {
          case 0:
            r.mode = 14;
            break;
          case 1:
            if ((qr(r), (r.mode = 20), t === Xe.Z_TREES)) {
              (c >>>= 2), (l -= 2);
              break e;
            }
            break;
          case 2:
            r.mode = 17;
            break;
          case 3:
            (e.msg = 'invalid block type'), (r.mode = 30);
        }
        (c >>>= 2), (l -= 2);
        break;
      case 14:
        for (c >>>= 7 & l, l -= 7 & l; l < 32; ) {
          if (0 === s) break e;
          s--, (c += n[i++] << l), (l += 8);
        }
        if ((65535 & c) != ((c >>> 16) ^ 65535)) {
          (e.msg = 'invalid stored block lengths'), (r.mode = 30);
          break;
        }
        if (((r.length = 65535 & c), (c = 0), (l = 0), (r.mode = 15), t === Xe.Z_TREES)) break e;
      case 15:
        r.mode = 16;
      case 16:
        if ((p = r.length)) {
          if ((p > s && (p = s), p > u && (p = u), 0 === p)) break e;
          o.set(n.subarray(i, i + p), a), (s -= p), (i += p), (u -= p), (a += p), (r.length -= p);
          break;
        }
        r.mode = 12;
        break;
      case 17:
        for (; l < 14; ) {
          if (0 === s) break e;
          s--, (c += n[i++] << l), (l += 8);
        }
        if (
          ((r.nlen = 257 + (31 & c)),
          (c >>>= 5),
          (l -= 5),
          (r.ndist = 1 + (31 & c)),
          (c >>>= 5),
          (l -= 5),
          (r.ncode = 4 + (15 & c)),
          (c >>>= 4),
          (l -= 4),
          r.nlen > 286 || r.ndist > 30)
        ) {
          (e.msg = 'too many length or distance symbols'), (r.mode = 30);
          break;
        }
        (r.have = 0), (r.mode = 18);
      case 18:
        for (; r.have < r.ncode; ) {
          for (; l < 3; ) {
            if (0 === s) break e;
            s--, (c += n[i++] << l), (l += 8);
          }
          (r.lens[x[r.have++]] = 7 & c), (c >>>= 3), (l -= 3);
        }
        for (; r.have < 19; ) r.lens[x[r.have++]] = 0;
        if (
          ((r.lencode = r.lendyn),
          (r.lenbits = 7),
          (S = {
            bits: r.lenbits,
          }),
          (A = Sr(0, r.lens, 0, 19, r.lencode, 0, r.work, S)),
          (r.lenbits = S.bits),
          A)
        ) {
          (e.msg = 'invalid code lengths set'), (r.mode = 30);
          break;
        }
        (r.have = 0), (r.mode = 19);
      case 19:
        for (; r.have < r.nlen + r.ndist; ) {
          for (
            ;
            (y = ((O = r.lencode[c & ((1 << r.lenbits) - 1)]) >>> 16) & 255), (m = 65535 & O), !((v = O >>> 24) <= l);

          ) {
            if (0 === s) break e;
            s--, (c += n[i++] << l), (l += 8);
          }
          if (m < 16) (c >>>= v), (l -= v), (r.lens[r.have++] = m);
          else {
            if (16 === m) {
              for (k = v + 2; l < k; ) {
                if (0 === s) break e;
                s--, (c += n[i++] << l), (l += 8);
              }
              if (((c >>>= v), (l -= v), 0 === r.have)) {
                (e.msg = 'invalid bit length repeat'), (r.mode = 30);
                break;
              }
              (P = r.lens[r.have - 1]), (p = 3 + (3 & c)), (c >>>= 2), (l -= 2);
            } else if (17 === m) {
              for (k = v + 3; l < k; ) {
                if (0 === s) break e;
                s--, (c += n[i++] << l), (l += 8);
              }
              (l -= v), (P = 0), (p = 3 + (7 & (c >>>= v))), (c >>>= 3), (l -= 3);
            } else {
              for (k = v + 7; l < k; ) {
                if (0 === s) break e;
                s--, (c += n[i++] << l), (l += 8);
              }
              (l -= v), (P = 0), (p = 11 + (127 & (c >>>= v))), (c >>>= 7), (l -= 7);
            }
            if (r.have + p > r.nlen + r.ndist) {
              (e.msg = 'invalid bit length repeat'), (r.mode = 30);
              break;
            }
            for (; p--; ) r.lens[r.have++] = P;
          }
        }
        if (30 === r.mode) break;
        if (0 === r.lens[256]) {
          (e.msg = 'invalid code -- missing end-of-block'), (r.mode = 30);
          break;
        }
        if (
          ((r.lenbits = 9),
          (S = {
            bits: r.lenbits,
          }),
          (A = Sr(1, r.lens, 0, r.nlen, r.lencode, 0, r.work, S)),
          (r.lenbits = S.bits),
          A)
        ) {
          (e.msg = 'invalid literal/lengths set'), (r.mode = 30);
          break;
        }
        if (
          ((r.distbits = 6),
          (r.distcode = r.distdyn),
          (S = {
            bits: r.distbits,
          }),
          (A = Sr(2, r.lens, r.nlen, r.ndist, r.distcode, 0, r.work, S)),
          (r.distbits = S.bits),
          A)
        ) {
          (e.msg = 'invalid distances set'), (r.mode = 30);
          break;
        }
        if (((r.mode = 20), t === Xe.Z_TREES)) break e;
      case 20:
        r.mode = 21;
      case 21:
        if (s >= 6 && u >= 258) {
          (e.next_out = a),
            (e.avail_out = u),
            (e.next_in = i),
            (e.avail_in = s),
            (r.hold = c),
            (r.bits = l),
            br(e, d),
            (a = e.next_out),
            (o = e.output),
            (u = e.avail_out),
            (i = e.next_in),
            (n = e.input),
            (s = e.avail_in),
            (c = r.hold),
            (l = r.bits),
            12 === r.mode && (r.back = -1);
          break;
        }
        for (
          r.back = 0;
          (y = ((O = r.lencode[c & ((1 << r.lenbits) - 1)]) >>> 16) & 255), (m = 65535 & O), !((v = O >>> 24) <= l);

        ) {
          if (0 === s) break e;
          s--, (c += n[i++] << l), (l += 8);
        }
        if (y && 0 == (240 & y)) {
          for (
            b = v, _ = y, w = m;
            (y = ((O = r.lencode[w + ((c & ((1 << (b + _)) - 1)) >> b)]) >>> 16) & 255),
              (m = 65535 & O),
              !(b + (v = O >>> 24) <= l);

          ) {
            if (0 === s) break e;
            s--, (c += n[i++] << l), (l += 8);
          }
          (c >>>= b), (l -= b), (r.back += b);
        }
        if (((c >>>= v), (l -= v), (r.back += v), (r.length = m), 0 === y)) {
          r.mode = 26;
          break;
        }
        if (32 & y) {
          (r.back = -1), (r.mode = 12);
          break;
        }
        if (64 & y) {
          (e.msg = 'invalid literal/length code'), (r.mode = 30);
          break;
        }
        (r.extra = 15 & y), (r.mode = 22);
      case 22:
        if (r.extra) {
          for (k = r.extra; l < k; ) {
            if (0 === s) break e;
            s--, (c += n[i++] << l), (l += 8);
          }
          (r.length += c & ((1 << r.extra) - 1)), (c >>>= r.extra), (l -= r.extra), (r.back += r.extra);
        }
        (r.was = r.length), (r.mode = 23);
      case 23:
        for (
          ;
          (y = ((O = r.distcode[c & ((1 << r.distbits) - 1)]) >>> 16) & 255), (m = 65535 & O), !((v = O >>> 24) <= l);

        ) {
          if (0 === s) break e;
          s--, (c += n[i++] << l), (l += 8);
        }
        if (0 == (240 & y)) {
          for (
            b = v, _ = y, w = m;
            (y = ((O = r.distcode[w + ((c & ((1 << (b + _)) - 1)) >> b)]) >>> 16) & 255),
              (m = 65535 & O),
              !(b + (v = O >>> 24) <= l);

          ) {
            if (0 === s) break e;
            s--, (c += n[i++] << l), (l += 8);
          }
          (c >>>= b), (l -= b), (r.back += b);
        }
        if (((c >>>= v), (l -= v), (r.back += v), 64 & y)) {
          (e.msg = 'invalid distance code'), (r.mode = 30);
          break;
        }
        (r.offset = m), (r.extra = 15 & y), (r.mode = 24);
      case 24:
        if (r.extra) {
          for (k = r.extra; l < k; ) {
            if (0 === s) break e;
            s--, (c += n[i++] << l), (l += 8);
          }
          (r.offset += c & ((1 << r.extra) - 1)), (c >>>= r.extra), (l -= r.extra), (r.back += r.extra);
        }
        if (r.offset > r.dmax) {
          (e.msg = 'invalid distance too far back'), (r.mode = 30);
          break;
        }
        r.mode = 25;
      case 25:
        if (0 === u) break e;
        if (((p = d - u), r.offset > p)) {
          if ((p = r.offset - p) > r.whave && r.sane) {
            (e.msg = 'invalid distance too far back'), (r.mode = 30);
            break;
          }
          p > r.wnext ? ((p -= r.wnext), (h = r.wsize - p)) : (h = r.wnext - p),
            p > r.length && (p = r.length),
            (g = r.window);
        } else (g = o), (h = a - r.offset), (p = r.length);
        p > u && (p = u), (u -= p), (r.length -= p);
        do {
          o[a++] = g[h++];
        } while (--p);
        0 === r.length && (r.mode = 21);
        break;
      case 26:
        if (0 === u) break e;
        (o[a++] = r.length), u--, (r.mode = 21);
        break;
      case 27:
        if (r.wrap) {
          for (; l < 32; ) {
            if (0 === s) break e;
            s--, (c |= n[i++] << l), (l += 8);
          }
          if (
            ((d -= u),
            (e.total_out += d),
            (r.total += d),
            d && (e.adler = r.check = r.flags ? Ze(r.check, o, d, a - d) : Ke(r.check, o, d, a - d)),
            (d = u),
            (r.flags ? c : Ur(c)) !== r.check)
          ) {
            (e.msg = 'incorrect data check'), (r.mode = 30);
            break;
          }
          (c = 0), (l = 0);
        }
        r.mode = 28;
      case 28:
        if (r.wrap && r.flags) {
          for (; l < 32; ) {
            if (0 === s) break e;
            s--, (c += n[i++] << l), (l += 8);
          }
          if (c !== (4294967295 & r.total)) {
            (e.msg = 'incorrect length check'), (r.mode = 30);
            break;
          }
          (c = 0), (l = 0);
        }
        r.mode = 29;
      case 29:
        A = Xe.Z_STREAM_END;
        break e;
      case 30:
        A = Xe.Z_DATA_ERROR;
        break e;
      case 31:
        return Xe.Z_MEM_ERROR;
      case 32:
      default:
        return Xe.Z_STREAM_ERROR;
    }
  return (
    (e.next_out = a),
    (e.avail_out = u),
    (e.next_in = i),
    (e.avail_in = s),
    (r.hold = c),
    (r.bits = l),
    (r.wsize || (d !== e.avail_out && r.mode < 30 && (r.mode < 27 || t !== Xe.Z_FINISH))) &&
      Gr(e, e.output, e.next_out, d - e.avail_out),
    (f -= e.avail_in),
    (d -= e.avail_out),
    (e.total_in += f),
    (e.total_out += d),
    (r.total += d),
    r.wrap &&
      d &&
      (e.adler = r.check = r.flags ? Ze(r.check, o, d, e.next_out - d) : Ke(r.check, o, d, e.next_out - d)),
    (e.data_type = r.bits + (r.last ? 64 : 0) + (12 === r.mode ? 128 : 0) + (20 === r.mode || 15 === r.mode ? 256 : 0)),
    ((0 === f && 0 === d) || t === Xe.Z_FINISH) && A === Xe.Z_OK && (A = Xe.Z_BUF_ERROR),
    A
  );
};

const Ze = function (e, t, r, n) {
  var o = Je,
    i = n + r;
  e ^= -1;
  for (var a = n; a < i; a++) e = (e >>> 8) ^ o[255 & (e ^ t[a])];
  return -1 ^ e;
};
const Je = new Uint32Array(
  (function () {
    for (var e, t: any[] = [], r = 0; r < 256; r++) {
      e = r;
      for (var n = 0; n < 8; n++) e = 1 & e ? 3988292384 ^ (e >>> 1) : e >>> 1;
      t[r] = e;
    }
    return t;
  })(),
);

const Ur = function (e) {
  return ((e >>> 24) & 255) + ((e >>> 8) & 65280) + ((65280 & e) << 8) + ((255 & e) << 24);
};

let $r = !0;
const qr = function (e) {
  if ($r) {
    (Rr = new Int32Array(512)), (Nr = new Int32Array(32));
    for (var t = 0; t < 144; ) e.lens[t++] = 8;
    for (; t < 256; ) e.lens[t++] = 9;
    for (; t < 280; ) e.lens[t++] = 7;
    for (; t < 288; ) e.lens[t++] = 8;
    for (
      Sr(1, e.lens, 0, 288, Rr, 0, e.work, {
        bits: 9,
      }),
        t = 0;
      t < 32;

    )
      e.lens[t++] = 5;
    Sr(2, e.lens, 0, 32, Nr, 0, e.work, {
      bits: 5,
    }),
      ($r = !1);
  }
  (e.lencode = Rr), (e.lenbits = 9), (e.distcode = Nr), (e.distbits = 5);
};

const _r = new Uint16Array([
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0,
  0,
]);
const wr = new Uint8Array([
  16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16,
  72, 78,
]);
const Pr = new Uint16Array([
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577, 0, 0,
]);
const Ar = new Uint8Array([
  16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29,
  29, 64, 64,
]);
const Sr = function (e, t, r, n, o, i, a, s) {
  var u,
    c,
    l,
    f,
    d,
    p,
    h,
    g,
    v,
    y = s.bits,
    m = 0,
    b = 0,
    _ = 0,
    w = 0,
    P = 0,
    A = 0,
    S = 0,
    k = 0,
    O = 0,
    E = 0,
    x: any = null,
    C = 0,
    I = new Uint16Array(16),
    j = new Uint16Array(16),
    T: any = null,
    L = 0;
  for (m = 0; m <= 15; m++) I[m] = 0;
  for (b = 0; b < n; b++) I[t[r + b]]++;
  for (P = y, w = 15; w >= 1 && 0 === I[w]; w--);
  if ((P > w && (P = w), 0 === w)) return (o[i++] = 20971520), (o[i++] = 20971520), (s.bits = 1), 0;
  for (_ = 1; _ < w && 0 === I[_]; _++);
  for (P < _ && (P = _), k = 1, m = 1; m <= 15; m++) if (((k <<= 1), (k -= I[m]) < 0)) return -1;
  if (k > 0 && (0 === e || 1 !== w)) return -1;
  for (j[1] = 0, m = 1; m < 15; m++) j[m + 1] = j[m] + I[m];
  for (b = 0; b < n; b++) 0 !== t[r + b] && (a[j[t[r + b]]++] = b);
  if (
    (0 === e
      ? ((x = T = a), (p = 19))
      : 1 === e
      ? ((x = _r), (C -= 257), (T = wr), (L -= 257), (p = 256))
      : ((x = Pr), (T = Ar), (p = -1)),
    (E = 0),
    (b = 0),
    (m = _),
    (d = i),
    (A = P),
    (S = 0),
    (l = -1),
    (f = (O = 1 << P) - 1),
    (1 === e && O > 852) || (2 === e && O > 592))
  )
    return 1;
  for (;;) {
    (h = m - S),
      a[b] < p ? ((g = 0), (v = a[b])) : a[b] > p ? ((g = T[L + a[b]]), (v = x[C + a[b]])) : ((g = 96), (v = 0)),
      (u = 1 << (m - S)),
      (_ = c = 1 << A);
    do {
      o[d + (E >> S) + (c -= u)] = (h << 24) | (g << 16) | v | 0;
    } while (0 !== c);
    for (u = 1 << (m - 1); E & u; ) u >>= 1;
    if ((0 !== u ? ((E &= u - 1), (E += u)) : (E = 0), b++, 0 == --I[m])) {
      if (m === w) break;
      m = t[r + a[b]];
    }
    if (m > P && (E & f) !== l) {
      for (0 === S && (S = P), d += _, k = 1 << (A = m - S); A + S < w && !((k -= I[A + S]) <= 0); ) A++, (k <<= 1);
      if (((O += 1 << A), (1 === e && O > 852) || (2 === e && O > 592))) return 1;
      o[(l = E & f)] = (P << 24) | (A << 16) | (d - i) | 0;
    }
  }
  return 0 !== E && (o[d + E] = ((m - S) << 24) | (64 << 16) | 0), (s.bits = P), 0;
};

const br = function (e, t) {
  var r,
    n,
    o,
    i,
    a,
    s,
    u,
    c,
    l,
    f,
    d,
    p,
    h,
    g,
    v,
    y,
    m,
    b,
    _,
    w,
    P,
    A,
    S,
    k,
    O = e.state;
  (r = e.next_in),
    (S = e.input),
    (n = r + (e.avail_in - 5)),
    (o = e.next_out),
    (k = e.output),
    (i = o - (t - e.avail_out)),
    (a = o + (e.avail_out - 257)),
    (s = O.dmax),
    (u = O.wsize),
    (c = O.whave),
    (l = O.wnext),
    (f = O.window),
    (d = O.hold),
    (p = O.bits),
    (h = O.lencode),
    (g = O.distcode),
    (v = (1 << O.lenbits) - 1),
    (y = (1 << O.distbits) - 1);
  e: do {
    p < 15 && ((d += S[r++] << p), (p += 8), (d += S[r++] << p), (p += 8)), (m = h[d & v]);
    t: for (;;) {
      if (((d >>>= b = m >>> 24), (p -= b), 0 === (b = (m >>> 16) & 255))) k[o++] = 65535 & m;
      else {
        if (!(16 & b)) {
          if (0 == (64 & b)) {
            m = h[(65535 & m) + (d & ((1 << b) - 1))];
            continue t;
          }
          if (32 & b) {
            O.mode = 12;
            break e;
          }
          (e.msg = 'invalid literal/length code'), (O.mode = 30);
          break e;
        }
        (_ = 65535 & m),
          (b &= 15) && (p < b && ((d += S[r++] << p), (p += 8)), (_ += d & ((1 << b) - 1)), (d >>>= b), (p -= b)),
          p < 15 && ((d += S[r++] << p), (p += 8), (d += S[r++] << p), (p += 8)),
          (m = g[d & y]);
        r: for (;;) {
          if (((d >>>= b = m >>> 24), (p -= b), !(16 & (b = (m >>> 16) & 255)))) {
            if (0 == (64 & b)) {
              m = g[(65535 & m) + (d & ((1 << b) - 1))];
              continue r;
            }
            (e.msg = 'invalid distance code'), (O.mode = 30);
            break e;
          }
          if (
            ((w = 65535 & m),
            p < (b &= 15) && ((d += S[r++] << p), (p += 8) < b && ((d += S[r++] << p), (p += 8))),
            (w += d & ((1 << b) - 1)) > s)
          ) {
            (e.msg = 'invalid distance too far back'), (O.mode = 30);
            break e;
          }
          if (((d >>>= b), (p -= b), w > (b = o - i))) {
            if ((b = w - b) > c && O.sane) {
              (e.msg = 'invalid distance too far back'), (O.mode = 30);
              break e;
            }
            if (((P = 0), (A = f), 0 === l)) {
              if (((P += u - b), b < _)) {
                _ -= b;
                do {
                  k[o++] = f[P++];
                } while (--b);
                (P = o - w), (A = k);
              }
            } else if (l < b) {
              if (((P += u + l - b), (b -= l) < _)) {
                _ -= b;
                do {
                  k[o++] = f[P++];
                } while (--b);
                if (((P = 0), l < _)) {
                  _ -= b = l;
                  do {
                    k[o++] = f[P++];
                  } while (--b);
                  (P = o - w), (A = k);
                }
              }
            } else if (((P += l - b), b < _)) {
              _ -= b;
              do {
                k[o++] = f[P++];
              } while (--b);
              (P = o - w), (A = k);
            }
            for (; _ > 2; ) (k[o++] = A[P++]), (k[o++] = A[P++]), (k[o++] = A[P++]), (_ -= 3);
            _ && ((k[o++] = A[P++]), _ > 1 && (k[o++] = A[P++]));
          } else {
            P = o - w;
            do {
              (k[o++] = k[P++]), (k[o++] = k[P++]), (k[o++] = k[P++]), (_ -= 3);
            } while (_ > 2);
            _ && ((k[o++] = k[P++]), _ > 1 && (k[o++] = k[P++]));
          }
          break;
        }
      }
      break;
    }
  } while (r < n && o < a);
  (r -= _ = p >> 3),
    (d &= (1 << (p -= _ << 3)) - 1),
    (e.next_in = r),
    (e.next_out = o),
    (e.avail_in = r < n ? n - r + 5 : 5 - (r - n)),
    (e.avail_out = o < a ? a - o + 257 : 257 - (o - a)),
    (O.hold = d),
    (O.bits = p);
};

for (var Zt = new Uint8Array(256), Yt = 0; Yt < 256; Yt++)
  Zt[Yt] = Yt >= 252 ? 6 : Yt >= 248 ? 5 : Yt >= 240 ? 4 : Yt >= 224 ? 3 : Yt >= 192 ? 2 : 1;
Zt[254] = Zt[254] = 1;

const tr = function (e, t) {
  (t = t || e.length) > e.length && (t = e.length);
  for (var r = t - 1; r >= 0 && 128 == (192 & e[r]); ) r--;
  return r < 0 || 0 === r ? t : r + Zt[e[r]] > t ? r : t;
};

const er = function (e, t) {
  return new TextDecoder().decode(e.subarray(0, t));
};

const Jr = function (e) {
  if (!e || !e.state) return Xe.Z_STREAM_ERROR;
  var t = e.state;
  return t.window && (t.window = null), (e.state = null), Xe.Z_OK;
};
