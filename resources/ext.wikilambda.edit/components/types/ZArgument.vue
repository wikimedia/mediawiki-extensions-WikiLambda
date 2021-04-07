<template>
	<!--
		WikiLambda Vue interface module for editing ZArgument objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		(<z-string
			v-if="argumentKeyId"
			:zobject-id="argumentKeyId"
			:viewmode="true"></z-string>)
		<div>
			{{ typeLabel }}:
			<z-object-selector
				:type="Constants.Z_TYPE"
				:placeholder="$i18n( 'wikilambda-argument-typeselector-label' )"
				:selected-id="argumentType"
				:viewmode="viewmode"
				@input="typeHandler"
			></z-object-selector>
		</div>
		<div>
			{{ labelsLabel }}:
			<z-multilingual-string
				v-if="argumentLabelsId"
				:zobject-id="argumentLabelsId"
				:viewmode="viewmode"
			></z-multilingual-string>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( './../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	mapState = require( 'vuex' ).mapState,
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	ZString = require( './ZString.vue' ),
	ZMultilingualString = require( './ZMultilingualString.vue' );

module.exports = {
	components: {
		'z-object-selector': ZObjectSelector,
		'z-multilingual-string': ZMultilingualString,
		'z-string': ZString
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		viewmode: {
			type: Boolean,
			required: true
		}
	},
	mixins: [ typeUtils ],
	computed: $.extend(
		mapGetters( {
			nextKey: 'getNextKey',
			zLang: 'zLang',
			getZObjectChildrenById: 'getZObjectChildrenById'
		} ),
		mapState( {
			zKeyLabels: 'zKeyLabels'
		} ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			Constants: function () {
				return Constants;
			},
			argumentTypeItem: function () {
				return this.findKeyInArray( Constants.Z_ARGUMENT_TYPE, this.zobject );
			},
			argumentType: function () {
				if ( this.argumentTypeItem ) {
					return this.argumentTypeItem.value;
				}
			},
			argumentKeyId: function () {
				var item = this.findKeyInArray( Constants.Z_ARGUMENT_KEY, this.zobject );
				if ( item ) {
					return item.id;
				}
			},
			argumentLabelsId: function () {
				var item = this.findKeyInArray( Constants.Z_ARGUMENT_LABEL, this.zobject );
				if ( item ) {
					return item.id;
				}
			},
			typeLabel: function () {
				return this.zKeyLabels[ Constants.Z_ARGUMENT_TYPE ];
			},
			labelsLabel: function () {
				return this.zKeyLabels[ Constants.Z_ARGUMENT_LABEL ];
			}
		} ),
	methods: $.extend( mapActions( [ 'fetchZKeys', 'setZObjectValue' ] ), {
		typeHandler: function ( type ) {
			var payload = {
				id: this.argumentTypeItem.id,
				value: type
			};
			this.setZObjectValue( payload );
		}
	} ),
	mounted: function () {
		this.fetchZKeys( {
			zids: [ Constants.Z_ARGUMENT ],
			zlangs: [ this.zLang ]
		} );
	}
};
</script>
