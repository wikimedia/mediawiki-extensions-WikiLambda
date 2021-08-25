<template>
	<!--
		WikiLambda Vue interface module for persistent (MediaWiki-stored) ZObjects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div :class="{ 'ext-wikilambda-persistentobject-metadata': hasDetailsToDisplay }">
		<div v-if="zObjectValue.id">
			<z-metadata
				:zobject-id="zobjectId"
			></z-metadata>
			<h2 class="ext-wikilambda-persistentobject-header">
				{{ $i18n( 'wikilambda-persistentzobject-contents' ) }}
			</h2>
			<div class="ext-wikilambda-persistentobject-content">
				<div v-if="!(viewmode || readonly)" class="ext-wikilambda-clear-persistentobject">
					<button
						:title="$i18n( 'wikilambda-editor-zobject-clearitem-tooltip' )"
						@click="removeKey( zObjectValue.id )"
					>
						{{ $i18n( 'wikilambda-editor-clearitem' ) }}
					</button>
				</div>
				<z-object-key
					:key="Constants.Z_PERSISTENTOBJECT_VALUE"
					:zobject-id="zObjectValue.id"
					:parent-type="zObjectType"
					:readonly="viewmode || readonly"
				></z-object-key>
			</div>
		</div>
		<div v-if="hasDetailsToDisplay" class="ext-wikilambda-sidebar">
			<div>
				<h2>
					{{ $i18n( 'wikilambda-persistentobject-details-label' ) }}
				</h2>
				<template v-if="isCurrentZObjectExecutable && getCurrentZObjectReturnType">
					<h3>
						{{ $i18n( 'wikilambda-persistentobject-function-signature-label' ) }}
					</h3>
					<z-function-signature
						:arguments="getZargumentsString"
						:return-type="getCurrentZObjectReturnType"
					></z-function-signature>
					<h3>
						{{ $i18n( 'wikilambda-persistentobject-evaluate-function' ) }}
					</h3>
					<z-function-evaluator></z-function-evaluator>
				</template>
				<div v-if="$store.getters.isExpertMode">
					<h3>
						{{ $i18n( 'wikilambda-expert-mode-json-label' ) }}
					</h3>
					<z-object-json
						:readonly="true"
						:zobject-raw="getZObjectAsJson"
					></z-object-json>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	ZObjectKey = require( '../ZObjectKey.vue' ),
	ZMetadata = require( './ZMetadata.vue' ),
	ZFunctionEvaluator = require( '../function/ZFunctionEvaluator.vue' ),
	ZFunctionSignature = require( '../ZFunctionSignature.vue' ),
	ZObjectJson = require( '../ZObjectJson.vue' );

module.exports = {
	components: {
		'z-object-key': ZObjectKey,
		'z-metadata': ZMetadata,
		'z-function-evaluator': ZFunctionEvaluator,
		'z-function-signature': ZFunctionSignature,
		'z-object-json': ZObjectJson
	},
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getZObjectTypeById',
		'getZkeyLabels',
		'getZkeys',
		'isCurrentZObjectExecutable',
		'getZargumentsString',
		'getCurrentZObjectType',
		'getZObjectAsJsonById',
		'getZObjectAsJson'
	] ), {
		Constants: function () {
			return Constants;
		},
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		zObjectType: function () {
			return this.getZObjectTypeById( this.zobjectId );
		},
		zObjectValue: function () {
			return this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_VALUE, this.zobject );
		},
		getCurrentZObjectReturnType: function () {
			if ( this.getCurrentZObjectType === Constants.Z_FUNCTION ) {
				return this.getZkeyLabels[ this.getZObjectAsJsonById( this.zobjectId ).Z2K2.Z8K2.Z9K1 ];
			} else if ( this.getCurrentZObjectType === Constants.Z_IMPLEMENTATION ) {
				var zFunction = this.getZObjectAsJsonById( this.zobjectId ),
					zFunctionReference = zFunction.Z2K2.Z14K1,
					zFunctionId = zFunctionReference ? zFunctionReference.Z9K1 : null;

				if ( !this.getZkeys[ zFunctionId ] ) {
					return;
				}

				return this.getZkeyLabels[ this.getZkeys[ zFunctionId ].Z2K2.Z8K2 ];
			}
		},
		hasDetailsToDisplay: function () {
			return this.isCurrentZObjectExecutable || this.$store.getters.isExpertMode;
		}
	} ),
	methods: $.extend( mapActions( [
		'removeZObjectChildren'
	] ), {
		removeKey: function ( objectId ) {
			this.removeZObjectChildren( objectId );
		}
	} )
};
</script>

<style lang="less">
.ext-wikilambda-persistentobject-metadata {
	display: grid;
	grid-template-columns: 2fr 1fr;

	@media ( max-width: 968px ) {
		grid-template-columns: 1fr;
	}
}

.ext-wikilambda-persistentobject-content {
	position: relative;

	.ext-wikilambda-clear-persistentobject {
		position: absolute;
		top: 0;
		right: 0;
	}
}

.ext-wikilambda-sidebar > div {
	margin: 10px;
	padding: 10px;
	background: #f8f9fa;
	border: #a2a9b1 solid 1px;
}
</style>
