THREE.STLLoader = function (manager) {
	this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager
};
THREE.STLLoader.prototype = {
	constructor: THREE.STLLoader,
	load: function (url, onLoad, onProgress, onError) {
		var scope = this;
		var loader = new THREE.FileLoader(scope.manager);
		loader.setResponseType('arraybuffer');
		loader.load(url, function (text) {
			try {
				onLoad(scope.parse(text))
			} catch (exception) {
				if (onError) {
					onError(exception)
				}
			}
		}, onProgress, onError)
	},
	parse: function (data) {
		function isBinary(data) {
			var expect, face_size, n_faces, reader;
			reader = new DataView(data);
			face_size = (32 / 8 * 3) + ((32 / 8 * 3) * 3) + (16 / 8);
			n_faces = reader.getUint32(80, !0);
			expect = 80 + (32 / 8) + (n_faces * face_size);
			if (expect === reader.byteLength) {
				return !0
			}
			var solid = [115, 111, 108, 105, 100];
			for (var i = 0; i < 5; i++) {
				if (solid[i] != reader.getUint8(i, !1)) return !0
			}
			return !1
		}

		function parseBinary(data) {
			var reader = new DataView(data);
			var faces = reader.getUint32(80, !0);
			var r, g, b, hasColors = !1,
				colors;
			var defaultR, defaultG, defaultB, alpha;
			for (var index = 0; index < 80 - 10; index++) {
				if ((reader.getUint32(index, !1) == 0x434F4C4F) && (reader.getUint8(index + 4) == 0x52) && (reader.getUint8(index + 5) == 0x3D)) {
					hasColors = !0;
					colors = [];
					defaultR = reader.getUint8(index + 6) / 255;
					defaultG = reader.getUint8(index + 7) / 255;
					defaultB = reader.getUint8(index + 8) / 255;
					alpha = reader.getUint8(index + 9) / 255
				}
			}
			var dataOffset = 84;
			var faceLength = 12 * 4 + 2;
			var geometry = new THREE.BufferGeometry();
			var vertices = [];
			var normals = [];
			for (var face = 0; face < faces; face++) {
				var start = dataOffset + face * faceLength;
				var normalX = reader.getFloat32(start, !0);
				var normalY = reader.getFloat32(start + 4, !0);
				var normalZ = reader.getFloat32(start + 8, !0);
				if (hasColors) {
					var packedColor = reader.getUint16(start + 48, !0);
					if ((packedColor & 0x8000) === 0) {
						r = (packedColor & 0x1F) / 31;
						g = ((packedColor >> 5) & 0x1F) / 31;
						b = ((packedColor >> 10) & 0x1F) / 31
					} else {
						r = defaultR;
						g = defaultG;
						b = defaultB
					}
				}
				for (var i = 1; i <= 3; i++) {
					var vertexstart = start + i * 12;
					vertices.push(reader.getFloat32(vertexstart, !0));
					vertices.push(reader.getFloat32(vertexstart + 4, !0));
					vertices.push(reader.getFloat32(vertexstart + 8, !0));
					normals.push(normalX, normalY, normalZ);
					if (hasColors) {
						colors.push(r, g, b)
					}
				}
			}
			geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
			geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
			if (hasColors) {
				geometry.addAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
				geometry.hasColors = !0;
				geometry.alpha = alpha
			}
			return geometry
		}

		function parseASCII(data) {
			var geometry = new THREE.BufferGeometry();
			var patternFace = /facet([\s\S]*?)endfacet/g;
			var faceCounter = 0;
			var patternFloat = /[\s]+([+-]?(?:\d*)(?:\.\d*)?(?:[eE][+-]?\d+)?)/.source;
			var patternVertex = new RegExp('vertex' + patternFloat + patternFloat + patternFloat, 'g');
			var patternNormal = new RegExp('normal' + patternFloat + patternFloat + patternFloat, 'g');
			var vertices = [];
			var normals = [];
			var normal = new THREE.Vector3();
			var result;
			while ((result = patternFace.exec(data)) !== null) {
				var vertexCountPerFace = 0;
				var normalCountPerFace = 0;
				var text = result[0];
				while ((result = patternNormal.exec(text)) !== null) {
					normal.x = parseFloat(result[1]);
					normal.y = parseFloat(result[2]);
					normal.z = parseFloat(result[3]);
					normalCountPerFace++
				}
				while ((result = patternVertex.exec(text)) !== null) {
					vertices.push(parseFloat(result[1]), parseFloat(result[2]), parseFloat(result[3]));
					normals.push(normal.x, normal.y, normal.z);
					vertexCountPerFace++
				}
				if (normalCountPerFace !== 1) {
					console.error('THREE.STLLoader: Something isn\'t right with the normal of face number ' + faceCounter)
				}
				if (vertexCountPerFace !== 3) {
					console.error('THREE.STLLoader: Something isn\'t right with the vertices of face number ' + faceCounter)
				}
				faceCounter++
			}
			geometry.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
			geometry.addAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
			return geometry
		}

		function ensureString(buffer) {
			if (typeof buffer !== 'string') {
				return THREE.LoaderUtils.decodeText(new Uint8Array(buffer))
			}
			return buffer
		}

		function ensureBinary(buffer) {
			if (typeof buffer === 'string') {
				var array_buffer = new Uint8Array(buffer.length);
				for (var i = 0; i < buffer.length; i++) {
					array_buffer[i] = buffer.charCodeAt(i) & 0xff
				}
				return array_buffer.buffer || array_buffer
			} else {
				return buffer
			}
		}
		var binData = ensureBinary(data);
		return isBinary(binData) ? parseBinary(binData) : parseASCII(ensureString(data))
	}
}